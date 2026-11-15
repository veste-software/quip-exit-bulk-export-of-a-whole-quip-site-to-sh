/**
 * Packout relay: a stateless Cloudflare Worker.
 * - /api/*        forwards Quip API calls (Quip sends no CORS headers), token passed through, never stored or logged
 * - /checkout, /license, /license/verify   Stripe Checkout (test mode until the owner goes live) and signed licences
 * - /e/:event     content-free event counter
 * No KV, R2, D1 or cache bindings. Logs only method, path template and status.
 */
import { signLicence, verifyLicence } from '../src/lib/license';
import { TIERS } from '../src/lib/pricing';

export interface Env {
  QUIP_HOST_ALLOWLIST?: string;
  ALLOWED_ORIGIN?: string;
  SITE_URL?: string;
  LICENCE_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_SITE?: string;
  STRIPE_PRICE_LARGE?: string;
}

const EVENTS = new Set(['dry_run_done', 'free_export_done', 'paid_export_done', 'export_failed', 'checkout_started']);
const NINETY_DAYS = 90 * 24 * 3600;

function cors(env: Env, req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, X-Quip-Host, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function hostAllowed(host: string, env: Env): boolean {
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(host)) return false;
  const list = (env.QUIP_HOST_ALLOWLIST ?? 'quip.com,*.quip.com').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const h = host.toLowerCase();
  return list.some((p) => (p.startsWith('*.') ? h.endsWith(p.slice(1)) && h.length > p.length - 1 : h === p));
}

/** "/1/threads/ABC123xyz90/messages" -> "/1/threads/:id/messages" so logs never carry document ids. */
const template = (path: string) => path.replace(/\/(?=[A-Za-z0-9_-]{8,}(?:\/|$))[A-Za-z0-9_-]*(?:[0-9A-Z])[A-Za-z0-9_-]*/g, '/:id');

function log(method: string, path: string, status: number) {
  console.log(`${method} ${template(path)} ${status}`);
}

function respond(env: Env, req: Request, body: BodyInit | null, status: number, extra: Record<string, string> = {}) {
  return new Response(body, { status, headers: { ...cors(env, req), 'Cache-Control': 'no-store', ...extra } });
}

const json = (env: Env, req: Request, data: unknown, status = 200) =>
  respond(env, req, JSON.stringify(data), status, { 'Content-Type': 'application/json' });

const form = (pairs: [string, string][]) => pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

async function stripe(env: Env, path: string, init: { method: string; body?: string }): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: init.body,
  });
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === 'OPTIONS') return respond(env, request, null, 204);

  if (pathname.startsWith('/api/')) {
    const host = request.headers.get('X-Quip-Host') ?? '';
    if (!hostAllowed(host, env)) return json(env, request, { error: 'host not allowed' }, 400);
    const headers = new Headers();
    const auth = request.headers.get('Authorization');
    if (auth) headers.set('Authorization', auth);
    headers.set('Accept', request.headers.get('Accept') ?? '*/*');
    const upstream = await fetch(`https://${host}${pathname.slice('/api'.length)}${url.search}`, { method: 'GET', headers });
    const out = new Headers(upstream.headers);
    out.delete('Set-Cookie');
    out.delete('Set-Cookie2');
    for (const [k, v] of Object.entries(cors(env, request))) out.set(k, v);
    out.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers: out });
  }

  if (pathname.startsWith('/e/')) {
    const event = pathname.slice(3);
    if (!EVENTS.has(event)) return respond(env, request, null, 404);
    console.log(`event=${event}`);
    return respond(env, request, null, 204);
  }

  if (pathname === '/checkout' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { tier?: string; host?: string; uid?: string; returnUrl?: string };
    const tier = TIERS.find((t) => t.id === body.tier && t.id !== 'free');
    if (!tier || !body.host || !body.uid || !env.STRIPE_SECRET_KEY) return json(env, request, { error: 'bad request' }, 400);
    const price = tier.id === 'site' ? env.STRIPE_PRICE_SITE : env.STRIPE_PRICE_LARGE;
    const base = env.SITE_URL || body.returnUrl || '';
    if (!price || !base) return json(env, request, { error: 'checkout not configured' }, 400);
    const bodyStr =
      form([
        ['mode', 'payment'],
        ['line_items[0][price]', price],
        ['line_items[0][quantity]', '1'],
        ['tax_id_collection[enabled]', 'true'],
        ['invoice_creation[enabled]', 'true'],
        ['cancel_url', base],
        ['metadata[tier]', tier.id],
        ['metadata[host]', body.host],
        ['metadata[uid]', body.uid],
      ]) + `&success_url=${encodeURIComponent(base)}%3Fsession_id%3D{CHECKOUT_SESSION_ID}`;
    const res = await stripe(env, '/checkout/sessions', { method: 'POST', body: bodyStr });
    if (!res.ok) return json(env, request, { error: 'checkout failed' }, 502);
    const session = (await res.json()) as { url?: string };
    return json(env, request, { url: session.url });
  }

  if (pathname === '/license' && request.method === 'GET') {
    const id = url.searchParams.get('session_id') ?? '';
    if (!/^cs_[A-Za-z0-9_]+$/.test(id) || !env.STRIPE_SECRET_KEY || !env.LICENCE_SECRET) return json(env, request, { error: 'bad request' }, 400);
    const res = await stripe(env, `/checkout/sessions/${id}`, { method: 'GET' });
    if (!res.ok) return json(env, request, { error: 'unknown session' }, 404);
    const s = (await res.json()) as { payment_status?: string; metadata?: { tier?: string; host?: string; uid?: string } };
    if (s.payment_status !== 'paid') return json(env, request, { error: 'not paid' }, 402);
    const tier = TIERS.find((t) => t.id === s.metadata?.tier && t.id !== 'free');
    if (!tier || !s.metadata?.host || !s.metadata?.uid) return json(env, request, { error: 'bad session' }, 400);
    const licence = await signLicence(
      { tier: tier.id as 'site' | 'large', cap: tier.cap, host: s.metadata.host, uid: s.metadata.uid, exp: Math.floor(Date.now() / 1000) + NINETY_DAYS },
      env.LICENCE_SECRET,
    );
    return json(env, request, { licence, tier: tier.id, cap: tier.cap });
  }

  if (pathname === '/license/verify' && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as { licence?: string; host?: string; uid?: string };
    if (!b.licence || !env.LICENCE_SECRET) return json(env, request, { error: 'bad request' }, 400);
    const check = await verifyLicence(b.licence, env.LICENCE_SECRET, { host: b.host ?? '', userId: b.uid ?? '', now: Date.now() });
    if (!check.ok) return json(env, request, { error: check.reason }, 403);
    return json(env, request, { tier: check.claims.tier, cap: check.claims.cap, exp: check.claims.exp });
  }

  return respond(env, request, 'not found', 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    try {
      const res = await handle(request, env);
      log(request.method, path, res.status);
      return res;
    } catch {
      log(request.method, path, 502);
      return new Response('relay error', { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
  },
};
