import { useEffect, useRef, useState } from 'preact/hooks';
import { QuipClient } from '../lib/quip/client';
import { RateLimiter, realClock, QuipHttpError } from '../lib/ratelimit';
import { dryRun, formatDuration, type Inventory } from '../lib/crawl';
import { runExport, LicenceRequiredError } from '../lib/export/run';
import { PRESET_LIST, type PresetId } from '../lib/export/presets';
import { FREE_CAP, formatEur, tierFor } from '../lib/pricing';
import { partBytes } from '../lib/export/zip';
import { barcodeBars } from '../lib/barcode';
import { IdbCheckpoint } from '../lib/checkpoint';
import { track } from '../lib/analytics';
import { fetchLicence, loadLicence, saveLicence, startCheckout, verifyLicence } from '../lib/billing';

type Phase = 'form' | 'counting' | 'result' | 'picking' | 'exporting' | 'done' | 'error';

interface Props {
  relayUrl?: string;
  baseUrl: string;
  defaultPreset?: PresetId;
}

const n = (x: number) => x.toLocaleString('en-GB');

function consignment(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const s = h.toString(16).toUpperCase().padStart(8, '0');
  return `PKO-${s.slice(0, 3)}-${s.slice(3, 6)}`;
}

function Barcode({ seed }: { seed: string }) {
  const bars = barcodeBars(seed);
  const w = bars.reduce((m, b) => Math.max(m, b.x + b.w), 0);
  return (
    <svg class="waybill__barcode" viewBox={`0 0 ${w} 48`} preserveAspectRatio="none" width="100%" height="48" aria-hidden="true" focusable="false">
      {bars.map((b) => <rect x={b.x} y="0" width={b.w} height="48" fill="currentColor" />)}
    </svg>
  );
}

function errorMessage(e: unknown): string {
  if (e instanceof LicenceRequiredError) return e.message;
  if (e instanceof QuipHttpError) {
    if (e.status === 401) return 'Quip refused the token (401). Make a new one at your Quip site under /dev/token and paste it again.';
    if (e.status === 403) return 'Quip says this token may not read that item (403). Check that it belongs to the account that owns the folders.';
    if (e.status === 429 || e.status === 503) return 'Quip kept throttling and the wait ran out. Nothing was lost; start again in a few minutes.';
    return `Quip answered with HTTP ${e.status}. Try again in a few minutes.`;
  }
  if (e instanceof TypeError) return 'The browser could not reach the relay or Quip. Check your connection and the company domain, then try again.';
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export default function ExportTool({ relayUrl = '', baseUrl, defaultPreset = 'archive' }: Props) {
  const [phase, setPhase] = useState<Phase>('form');
  const [hostChoice, setHostChoice] = useState<'quip.com' | 'custom'>('quip.com');
  const [custom, setCustom] = useState('');
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [sample, setSample] = useState(false);
  const [preset, setPreset] = useState<PresetId>(defaultPreset);
  const [inv, setInv] = useState<Inventory | null>(null);
  const [live, setLive] = useState({ folders: 0, threads: 0 });
  const [progress, setProgress] = useState({ done: 0, total: 0, title: '' });
  const [delay, setDelay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ urls: { name: string; url: string; size: number }[]; stats: { documents: number; comments: number; linksRewritten: number } } | null>(null);
  const [cap, setCap] = useState(FREE_CAP);
  const [paidNotice, setPaidNotice] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const client = useRef<QuipClient | null>(null);

  const host = hostChoice === 'quip.com' ? 'quip.com' : custom.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  useEffect(() => {
    if (phase === 'result' || phase === 'done' || phase === 'error') headRef.current?.focus();
  }, [phase]);

  // Back from Stripe Checkout: swap the session for a licence kept in this tab only.
  useEffect(() => {
    const sid = new URLSearchParams(location.search).get('session_id');
    if (sid && relayUrl) {
      fetchLicence(relayUrl, sid).then((l) => { saveLicence(l); setPaidNotice(true); history.replaceState(null, '', location.pathname); }).catch((e) => { setError(errorMessage(e)); setPhase('error'); });
    }
  }, []);

  async function buildClient(useSample: boolean): Promise<QuipClient> {
    if (useSample) {
      const { createMockQuipFetch } = await import('../mock/mockQuip');
      const { MOCK_TOKEN } = await import('../mock/fixtures');
      return new QuipClient({
        fetch: createMockQuipFetch() as typeof fetch,
        apiBase: 'https://sample.invalid',
        token: MOCK_TOKEN,
        host: 'quip.com',
        limiter: new RateLimiter({ perMinute: Infinity, perHour: Infinity, clock: realClock }),
      });
    }
    return new QuipClient({
      fetch: fetch.bind(globalThis),
      apiBase: `${relayUrl}/api`,
      token: token.trim(),
      host,
      limiter: new RateLimiter({ clock: realClock }),
      onThrottle: (ms) => setDelay(`Quip is throttling. Waiting ${Math.ceil(ms / 1000)} s.`),
    });
  }

  async function start(useSample: boolean) {
    setError(null);
    setFieldError(null);
    if (!useSample) {
      if (hostChoice === 'custom' && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return setFieldError('Enter your Quip domain, for example acme.quip.com.');
      if (token.trim().length < 8) return setFieldError('Paste your personal access token first.');
      if (!relayUrl) {
        setError('The relay that forwards your requests to Quip is not connected in this preview. Try the sample site to see the whole flow.');
        return setPhase('error');
      }
    }
    setSample(useSample);
    setPhase('counting');
    setLive({ folders: 0, threads: 0 });
    abort.current = new AbortController();
    try {
      const c = await buildClient(useSample);
      client.current = c;
      const effectiveHost = useSample ? 'quip.com' : host;
      const result = await dryRun(c, { host: effectiveHost, signal: abort.current.signal, onProgress: setLive });
      setInv(result);
      if (!useSample) track('dry_run_done', relayUrl);
      const lic = !useSample && relayUrl ? loadLicence() : null;
      setCap(FREE_CAP);
      if (lic) {
        const info = await verifyLicence(relayUrl, lic, effectiveHost, result.userId).catch(() => null);
        if (info) setCap(info.cap);
      }
      if (!useSample) {
        const prev = await IdbCheckpoint.latest({ host: effectiveHost, uid: result.userId, preset }).catch(() => undefined);
        setResumeFrom(prev && Object.keys(prev.record.threadStatus).length ? prev.record.createdAt : null);
      }
      setPhase('result');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return setPhase('form');
      setError(errorMessage(e));
      setPhase('error');
    }
  }

  async function doExport(ids?: string[]) {
    if (!inv || !client.current) return;
    setError(null);
    setPhase('exporting');
    setDelay(null);
    abort.current = new AbortController();
    let cp: IdbCheckpoint | undefined;
    if (!sample) {
      const meta = { host: inv.host, uid: inv.userId, preset };
      cp = (await IdbCheckpoint.latest(meta).catch(() => undefined)) ?? (await IdbCheckpoint.create(meta).catch(() => undefined));
    }
    try {
      const r = await runExport({
        checkpoint: cp,
        client: client.current,
        inventory: inv,
        preset,
        threadIds: ids,
        cap: sample ? Infinity : cap,
        signal: abort.current.signal,
        onProgress: (p) => { setProgress({ done: p.done, total: p.total, title: p.title }); setDelay(null); },
      });
      const urls = r.parts.map((p) => ({
        name: p.name,
        size: p.size,
        url: URL.createObjectURL(new Blob([partBytes(p) as BlobPart], { type: 'application/zip' })),
      }));
      await cp?.clear().catch(() => {});
      setResult({ urls, stats: r.stats });
      if (!sample) track(cap > FREE_CAP ? 'paid_export_done' : 'free_export_done', relayUrl);
      setPhase('done');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return setPhase('result');
      if (!sample) track('export_failed', relayUrl);
      setError(errorMessage(e));
      setPhase('error');
    }
  }

  async function buy() {
    if (!inv) return;
    if (!relayUrl) {
      setError('Payment is not connected in this preview. The free export of 20 documents works.');
      return setPhase('error');
    }
    try {
      const t = tierFor(inv.threads.filter((x) => x.type === 'document' || x.type === 'spreadsheet').length);
      if (t.id !== 'site' && t.id !== 'large') throw new Error('This site is over 20,000 documents. Export it in one pass per folder set.');
      location.href = await startCheckout(relayUrl, t.id, inv.host, inv.userId);
    } catch (e) {
      setError(errorMessage(e));
      setPhase('error');
    }
  }

  const exportable = inv ? inv.threads.filter((t) => t.type === 'document' || t.type === 'spreadsheet') : [];
  const total = exportable.length;
  const tier = tierFor(total);
  const covered = sample || total <= cap;
  const presetLabel = PRESET_LIST.find((p) => p.id === preset)!.label;
  const shownHost = sample ? 'sample data' : host;
  const tokenTail = sample ? '' : ` · token ••••${token.trim().slice(-2)}`;

  const stop = () => abort.current?.abort();
  const reset = () => { setPhase('form'); setInv(null); setResult(null); setError(null); };

  return (
    <div class="label tool" id="tool" aria-labelledby="tool-title">
      <div class="label__head">
        <span class="label-text" id="tool-title" ref={headRef} tabIndex={-1}>
          {phase === 'form' && 'Consignment · free dry run'}
          {phase === 'counting' && 'Counting…'}
          {(phase === 'result' || phase === 'picking') && `From ${shownHost} · To ${presetLabel}`}
          {phase === 'exporting' && `Taping up · To ${presetLabel}`}
          {phase === 'done' && 'Packed'}
          {phase === 'error' && 'Stopped'}
        </span>
        {inv && phase !== 'form' && phase !== 'error' && <span class="label-text num">{consignment(inv.userId + inv.host)}</span>}
      </div>

      {phase === 'form' && paidNotice && (
        <div class="notice" role="status">
          <span class="label-text notice__tag">Payment received</span>
          <p>Your licence is active in this tab. The page reloaded, so the token and the document list were cleared: paste your Quip token again and run the dry run once more, then export everything.</p>
        </div>
      )}
      {phase === 'form' && (
        <form onSubmit={(e) => { e.preventDefault(); start(false); }} noValidate>
          <fieldset class="ticks">
            <legend class="label-text">Where is your Quip?</legend>
            <div class="ticks__row seg">
              <label class="tick"><input type="radio" name="host" checked={hostChoice === 'quip.com'} onChange={() => setHostChoice('quip.com')} /> quip.com</label>
              <label class="tick"><input type="radio" name="host" checked={hostChoice === 'custom'} onChange={() => setHostChoice('custom')} /> Company domain</label>
            </div>
          </fieldset>
          {hostChoice === 'custom' && (
            <div class="field">
              <label class="label-text field__label" for="host-custom">Your Quip domain</label>
              <input id="host-custom" class="input" type="text" inputMode="url" autocomplete="off" placeholder="acme.quip.com" value={custom} onInput={(e) => setCustom((e.target as HTMLInputElement).value)} aria-describedby={fieldError ? 'tool-err' : undefined} />
            </div>
          )}
          <div class={`field`}>
            <label class="label-text field__label" for="token">Personal access token</label>
            <div class={`slot${token.trim().length >= 8 ? ' is-filled' : ''}`}>
              <div class="input-row">
                <input id="token" class="input" type={show ? 'text' : 'password'} autocomplete="off" spellcheck={false} placeholder="Paste token" value={token} onInput={(e) => setToken((e.target as HTMLInputElement).value)} aria-describedby={fieldError ? 'token-help tool-err' : 'token-help'} aria-invalid={fieldError ? 'true' : undefined} />
                <button type="button" class="toggle" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <p class="field__help" id="token-help">Get it at <span class="num">{hostChoice === 'quip.com' ? 'quip.com' : host || 'your-site'}/dev/token</span>. It stays in this tab and goes only to Quip.</p>
            {fieldError && <p class="field__error" id="tool-err" role="alert">{fieldError}</p>}
          </div>
          <button class="btn btn--block" type="submit">Count my documents – free</button>
          <p class="tool__after">
            Nothing is downloaded yet. <button type="button" class="linklike" onClick={() => start(true)}>Or try it on a sample site</button>
          </p>
        </form>
      )}

      {phase !== 'form' && phase !== 'error' && (
        <p class="label-text faded tool__line" aria-live="polite">{shownHost}{tokenTail}</p>
      )}

      {phase === 'counting' && (
        <div aria-live="polite">
          <div class="counts">
            <Count value={live.folders} label="Folders" />
            <Count value={live.threads} label="Items found" />
          </div>
          <p class="tape-progress__print label-text">Reading folders and documents. Quip allows about 700 requests an hour.</p>
          <button type="button" class="linklike" onClick={stop}>Stop</button>
        </div>
      )}

      {(phase === 'result' || phase === 'picking') && inv && total === 0 && (
        <div class="empty" aria-live="polite">
          <img src={`${baseUrl}art/spot-empty.svg`} width="240" height="180" alt="An empty carton" />
          <p>This token sees no documents. Check that it belongs to the account that owns the folders.</p>
          <button type="button" class="btn btn--secondary" onClick={reset}>Try another token</button>
        </div>
      )}

      {(phase === 'result' || phase === 'picking') && inv && total > 0 && (
        <div aria-live="polite">
          <div class="waybill__counts">
            {inv.counts.comments > 0 && <span class="sticker">Fragile: comments inside</span>}
            <Count value={inv.counts.folders} label="Folders" />
            <Count value={inv.counts.documents} label="Documents" />
            <Count value={inv.counts.spreadsheets} label="Spreadsheets" />
            <Count value={inv.counts.comments} label={inv.counts.commentsSampled ? 'Comments (sampled)' : 'Comments'} />
            <Count value={inv.counts.links} label="Links" />
            <Count value={inv.counts.multiFolder} label="In 2+ folders" />
          </div>
          <ul class="exceptions label-text">
            {inv.counts.multiFolder > 0 && <li>{inv.counts.multiFolder} {inv.counts.multiFolder === 1 ? 'document lives' : 'documents live'} in 2 folders. Stored once; the other folder gets a shortcut.</li>}
            {inv.counts.linksUnresolved > 0 && <li>{inv.counts.linksUnresolved} {inv.counts.linksUnresolved === 1 ? 'link points' : 'links point'} outside this site.</li>}
            {inv.counts.unsupported > 0 && <li>{inv.counts.unsupported} slides or chats cannot be exported by Quip’s API.</li>}
          </ul>
          <Barcode seed={consignment(inv.userId + inv.host)} />
          <hr class="perf" />
          <p class="stub__line">
            About <span class="num">{formatDuration(inv.hoursEstimate)}</span> for <span class="num">{n(inv.requestsEstimate)}</span> requests at Quip’s limit of about 700 an hour. You can close the laptop; it picks up where it stopped.
          </p>
          <fieldset class="ticks">
            <legend class="label-text">Shape it for</legend>
            <div class="ticks__row">
              {PRESET_LIST.map((p) => (
                <label class="tick" key={p.id}><input type="radio" name="preset" checked={preset === p.id} onChange={() => setPreset(p.id)} /> {p.label}</label>
              ))}
            </div>
          </fieldset>

          {phase === 'result' && (
            <div class="actions">
              {covered ? (
                <button type="button" class="btn btn--block" onClick={() => doExport()}>Export all <span class="num">{n(total)}</span> documents{sample || tier.priceEur === 0 ? ' – free' : ''}</button>
              ) : (
                <>
                  <button type="button" class="btn btn--block" onClick={buy}>Export all <span class="num">{n(total)}</span> documents – <span class="num">{tier.priceEur === null ? 'ask us' : formatEur(tier.priceEur)}</span></button>
                  <button type="button" class="btn btn--secondary btn--block" onClick={() => setPhase('picking')}>Export {FREE_CAP} for free</button>
                </>
              )}
              {resumeFrom && <p class="field__help">An export from {new Date(resumeFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} was interrupted. Starting it again continues where it stopped.</p>}
              <button type="button" class="linklike" onClick={reset}>Start over</button>
            </div>
          )}

          {phase === 'picking' && (
            <div>
              <table class="ledger">
                <caption class="label-text">Pick up to {FREE_CAP} · <span class="num">{picked.size}</span> chosen</caption>
                <thead><tr><th scope="col"><span class="visually-hidden">Pick</span></th><th scope="col">Document</th><th scope="col" class="num">Comments</th></tr></thead>
                <tbody>
                  {exportable.map((t) => {
                    const on = picked.has(t.id);
                    return (
                      <tr key={t.id}>
                        <td><label class="tick tick--bare"><input type="checkbox" checked={on} disabled={!on && picked.size >= FREE_CAP} aria-label={`Pick ${t.title}`} onChange={() => { const s = new Set(picked); on ? s.delete(t.id) : s.add(t.id); setPicked(s); }} /></label></td>
                        <td>{t.title}</td>
                        <td class="num">{t.commentCount ?? '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div class="actions">
                <button type="button" class="btn btn--block" disabled={picked.size === 0} onClick={() => doExport([...picked])}>Export <span class="num">{picked.size}</span> chosen – free</button>
                <button type="button" class="linklike" onClick={() => setPhase('result')}>Back</button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'exporting' && (
        <div aria-live="polite">
          <div class="tape-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Export progress">
            <div class="tape-progress__bar" style={{ '--progress': `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <p class="tape-progress__print label-text">Taped <span class="num">{n(progress.done)}</span> / <span class="num">{n(progress.total)}</span>{progress.title ? ` · ${progress.title}` : ''}</p>
          {delay && <div class="notice"><span class="label-text notice__tag">Delayed</span><p>{delay}</p></div>}
          <p class="field__help">You can close this tab only after the download is ready. Quip’s limit sets the pace.</p>
          <button type="button" class="linklike" onClick={stop}>Stop</button>
        </div>
      )}

      {phase === 'done' && result && (
        <div aria-live="polite">
          <p><span class="stamp">Packed</span></p>
          <p class="stub__line">Packed: <span class="num">{n(result.stats.documents)}</span> documents, <span class="num">{n(result.stats.comments)}</span> comments, <span class="num">{n(result.stats.linksRewritten)}</span> links rewritten. Keep manifest.csv as your receipt.</p>
          <div class="actions">
            {result.urls.map((u, i) => (
              <a key={u.name} class={`btn btn--block${i ? ' btn--secondary' : ''}`} href={u.url} download={u.name}>Download {u.name} <span class="num">({(u.size / 1_048_576).toFixed(1)} MB)</span></a>
            ))}
            {sample && <p class="field__help">This ZIP holds sample data, not your Quip.</p>}
            <button type="button" class="linklike" onClick={reset}>Start over</button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div>
          <div class="notice notice--stopped" role="alert">
            <span class="label-text notice__tag">Stopped</span>
            <p>{error}</p>
          </div>
          <div class="actions">
            <button type="button" class="btn btn--secondary btn--block" onClick={() => (inv ? setPhase('result') : reset())}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div class="count-cell">
      <div class="count num-stencil">{n(value)}</div>
      <div class="label-text faded">{label}</div>
    </div>
  );
}
