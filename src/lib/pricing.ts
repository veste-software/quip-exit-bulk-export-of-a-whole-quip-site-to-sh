/** The only place prices and tiers live. */
export type TierId = 'free' | 'site' | 'large' | 'split';

export interface Tier {
  id: TierId;
  name: string;
  /** Maximum number of documents the tier covers. */
  cap: number;
  /** Price in euro, or null when there is no single price. */
  priceEur: number | null;
}

export const FREE_CAP = 20;

export const TIERS: Tier[] = [
  { id: 'free', name: 'Free', cap: FREE_CAP, priceEur: 0 },
  { id: 'site', name: 'Site', cap: 2000, priceEur: 149 },
  { id: 'large', name: 'Large', cap: 20000, priceEur: 390 },
];

export function tierFor(documentCount: number): Tier {
  for (const t of TIERS) if (documentCount <= t.cap) return t;
  return { id: 'split', name: 'One pass per folder set', cap: Infinity, priceEur: null };
}

export function formatEur(n: number): string {
  return `${n.toLocaleString('en-GB')} €`;
}

export function priceLabel(t: Tier): string {
  return t.priceEur === null ? 'one pass per folder set' : t.priceEur === 0 ? 'free' : formatEur(t.priceEur);
}
