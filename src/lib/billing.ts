/** Client side of the relay's licence routes. The client never holds the signing secret. */
export interface LicenceInfo {
  token: string;
  tier: string;
  cap: number;
}

const KEY = 'packout.licence';

export function saveLicence(token: string): void {
  try { sessionStorage.setItem(KEY, token); } catch { /* storage blocked: keep going */ }
}
export function loadLicence(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

export async function startCheckout(relay: string, tier: 'site' | 'large', host: string, uid: string): Promise<string> {
  const res = await fetch(`${relay}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier, host, uid, returnUrl: location.origin + location.pathname }),
  });
  if (!res.ok) throw new Error(`Checkout could not be started (${res.status}).`);
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error('Checkout could not be started.');
  return data.url;
}

export async function fetchLicence(relay: string, sessionId: string): Promise<string> {
  const res = await fetch(`${relay}/license?session_id=${encodeURIComponent(sessionId)}`);
  if (res.status === 402) throw new Error('The payment is not complete yet.');
  if (!res.ok) throw new Error(`The licence could not be fetched (${res.status}).`);
  return ((await res.json()) as { licence: string }).licence;
}

export async function verifyLicence(relay: string, token: string, host: string, uid: string): Promise<LicenceInfo | null> {
  const res = await fetch(`${relay}/license/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licence: token, host, uid }),
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { tier: string; cap: number };
  return { token, tier: d.tier, cap: d.cap };
}
