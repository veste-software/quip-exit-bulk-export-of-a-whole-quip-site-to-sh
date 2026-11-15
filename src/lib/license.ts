/** Signed licence tokens (HMAC-SHA256, Web Crypto only). Shared by the worker; the client never sees the secret. */
export interface LicenceClaims {
  tier: 'site' | 'large';
  cap: number;
  host: string;
  uid: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

export type LicenceCheck = { ok: true; claims: LicenceClaims } | { ok: false; reason: 'format' | 'signature' | 'expired' | 'host' | 'user' };

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const key = (secret: string, usage: 'sign' | 'verify') =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);

export async function signLicence(claims: LicenceClaims, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign('HMAC', await key(secret, 'sign'), enc.encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyLicence(
  token: string,
  secret: string,
  expect: { host: string; userId: string; now: number },
): Promise<LicenceCheck> {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'format' };
  let claims: LicenceClaims;
  try {
    // crypto.subtle.verify compares in constant time.
    const valid = await crypto.subtle.verify('HMAC', await key(secret, 'verify'), fromB64url(parts[1]), enc.encode(parts[0]));
    if (!valid) return { ok: false, reason: 'signature' };
    claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
  } catch {
    return { ok: false, reason: 'format' };
  }
  if (claims.exp * 1000 <= expect.now) return { ok: false, reason: 'expired' };
  if (claims.host !== expect.host) return { ok: false, reason: 'host' };
  if (claims.uid !== expect.userId) return { ok: false, reason: 'user' };
  return { ok: true, claims };
}
