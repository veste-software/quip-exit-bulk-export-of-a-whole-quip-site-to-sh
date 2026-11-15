import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import relay, { type Env } from '../worker/relay';
import { signLicence, verifyLicence } from '../src/lib/license';
import { track } from '../src/lib/analytics';
import { createMockQuipFetch } from '../src/mock/mockQuip';
import { dryRun } from '../src/lib/crawl';
import { runExport } from '../src/lib/export/run';
import { partBytes } from '../src/lib/export/zip';
import { makeClient } from './helpers';

const env: Env = { LICENCE_SECRET: 'test-secret', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_SITE: 'price_site', STRIPE_PRICE_LARGE: 'price_large', SITE_URL: 'https://packout.test/' };
const claims = { tier: 'site' as const, cap: 2000, host: 'quip.com', uid: 'U1', exp: Math.floor(Date.now() / 1000) + 3600 };
const now = Date.now();

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('licence tokens', () => {
  it('accepts a valid token and rejects tampered, expired, wrong host and wrong user', async () => {
    const t = await signLicence(claims, 's');
    expect((await verifyLicence(t, 's', { host: 'quip.com', userId: 'U1', now })).ok).toBe(true);
    const [p, sig] = t.split('.');
    const forged = btoa(JSON.stringify({ ...claims, cap: 999999 })).replace(/=+$/, '');
    expect(await verifyLicence(`${forged}.${sig}`, 's', { host: 'quip.com', userId: 'U1', now })).toMatchObject({ ok: false, reason: 'signature' });
    expect(await verifyLicence(t, 'other', { host: 'quip.com', userId: 'U1', now })).toMatchObject({ ok: false });
    expect(await verifyLicence(t, 's', { host: 'quip.com', userId: 'U1', now: now + 7200_000 })).toMatchObject({ reason: 'expired' });
    expect(await verifyLicence(t, 's', { host: 'evil.com', userId: 'U1', now })).toMatchObject({ reason: 'host' });
    expect(await verifyLicence(t, 's', { host: 'quip.com', userId: 'U2', now })).toMatchObject({ reason: 'user' });
    expect(await verifyLicence(p, 's', { host: 'quip.com', userId: 'U1', now })).toMatchObject({ reason: 'format' });
  });
});

describe('relay', () => {
  it('rejects a host that is not on the allowlist', async () => {
    const res = await relay.fetch(new Request('https://relay.test/api/1/users/current', { headers: { 'X-Quip-Host': 'evil.example.com' } }), env);
    expect(res.status).toBe(400);
  });

  it('forwards with the token, strips cookies, never logs token or body', async () => {
    const upstream = vi.fn(async () => new Response('SECRET BODY TEXT', { status: 200, headers: { 'Set-Cookie': 'a=b', 'Content-Type': 'text/plain' } }));
    vi.stubGlobal('fetch', upstream);
    const logs: string[] = [];
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
    const res = await relay.fetch(new Request('https://relay.test/api/1/threads/ABCDEFGHIJK/messages?count=100', { headers: { 'X-Quip-Host': 'acme.quip.com', Authorization: 'Bearer TOKEN-123-SECRET', Cookie: 'sid=1' } }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const [calledUrl, init] = upstream.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe('https://acme.quip.com/1/threads/ABCDEFGHIJK/messages?count=100');
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer TOKEN-123-SECRET');
    expect((init.headers as Headers).get('Cookie')).toBeNull();
    const all = logs.join('\n');
    expect(all).not.toContain('TOKEN-123-SECRET');
    expect(all).not.toContain('SECRET BODY');
    expect(all).not.toContain('ABCDEFGHIJK');
    expect(all).toContain('/api/1/threads/:id/messages 200');
  });

  it('answers the CORS preflight and counts events without a body', async () => {
    const pre = await relay.fetch(new Request('https://relay.test/api/x', { method: 'OPTIONS', headers: { Origin: 'https://packout.test' } }), env);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect((await relay.fetch(new Request('https://relay.test/e/dry_run_done', { method: 'POST' }), env)).status).toBe(204);
    expect((await relay.fetch(new Request('https://relay.test/e/whatever', { method: 'POST' }), env)).status).toBe(404);
  });

  it('has no storage bindings in wrangler.toml', () => {
    const toml = readFileSync('worker/wrangler.toml', 'utf8').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
    for (const k of ['kv_namespaces', 'r2_buckets', 'd1_databases', 'durable_objects']) expect(toml).not.toContain(k);
  });
});

describe('checkout', () => {
  it('creates a session, refuses unpaid, and issues a verifiable licence when paid', async () => {
    const calls: { url: string; body?: string }[] = [];
    let paid = false;
    vi.stubGlobal('fetch', async (u: string, init?: RequestInit) => {
      calls.push({ url: u, body: init?.body as string | undefined });
      if (init?.method === 'POST') return new Response(JSON.stringify({ url: 'https://checkout.stripe.test/c/1' }));
      return new Response(JSON.stringify({ payment_status: paid ? 'paid' : 'unpaid', metadata: { tier: 'site', host: 'quip.com', uid: 'U1' } }));
    });
    const start = await relay.fetch(new Request('https://relay.test/checkout', { method: 'POST', body: JSON.stringify({ tier: 'site', host: 'quip.com', uid: 'U1' }) }), env);
    expect((await start.json()) as { url: string }).toEqual({ url: 'https://checkout.stripe.test/c/1' });
    const b = decodeURIComponent(calls[0].body!);
    expect(b).toContain('line_items[0][price]=price_site');
    expect(b).toContain('tax_id_collection[enabled]=true');
    expect(b).toContain('invoice_creation[enabled]=true');
    expect(calls[0].body).toContain('{CHECKOUT_SESSION_ID}');
    const r1 = await relay.fetch(new Request('https://relay.test/license?session_id=cs_test_1'), env);
    expect(r1.status).toBe(402);
    paid = true;
    const r2 = await relay.fetch(new Request('https://relay.test/license?session_id=cs_test_1'), env);
    const { licence } = (await r2.json()) as { licence: string };
    const ok = await verifyLicence(licence, env.LICENCE_SECRET!, { host: 'quip.com', userId: 'U1', now: Date.now() });
    expect(ok).toMatchObject({ ok: true, claims: { tier: 'site', cap: 2000 } });
    const verify = await relay.fetch(new Request('https://relay.test/license/verify', { method: 'POST', body: JSON.stringify({ licence, host: 'quip.com', uid: 'U1' }) }), env);
    expect(await verify.json()).toMatchObject({ cap: 2000 });
  });
});

describe('analytics', () => {
  it('sends only allowlisted event names, nothing else', () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    expect(track('dry_run_done', 'https://relay.test')).toBe(true);
    expect(beacon).toHaveBeenCalledWith('https://relay.test/e/dry_run_done');
    expect(track('user@example.com', 'https://relay.test')).toBe(false);
    expect(track('dry_run_done', '')).toBe(false);
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});

describe('token hygiene', () => {
  it('keeps the token out of URLs, the ZIP and analytics', async () => {
    const TOKEN = 'TOKEN-hygiene-9f3a7c-unique';
    const urls: string[] = [];
    const client = makeClient(createMockQuipFetch({ token: TOKEN, onRequest: (r) => urls.push(r.path) }), TOKEN);
    const inventory = await dryRun(client, { host: 'quip.com' });
    const res = await runExport({ client, inventory, preset: 'archive', cap: 100 });
    const zip = unzipSync(partBytes(res.parts[0]));
    const dump = (b: Uint8Array) => new TextDecoder('latin1').decode(b);
    for (const [name, data] of Object.entries(zip)) {
      expect(dump(data), name).not.toContain(TOKEN);
      if (/\.(docx|xlsx)$/.test(name)) for (const inner of Object.values(unzipSync(data))) expect(strFromU8(inner)).not.toContain(TOKEN);
    }
    expect(urls.length).toBeGreaterThan(20);
    for (const u of urls) expect(u).not.toContain(TOKEN);
    expect((globalThis as { localStorage?: unknown }).localStorage).toBeUndefined();
  });
});
