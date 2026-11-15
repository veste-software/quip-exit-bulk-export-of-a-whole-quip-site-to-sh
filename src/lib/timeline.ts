/** Retirement schedule from SalesforceBen (2026-03-04): read-only 90 days after term end, logins blocked 90 more, deletion over about 30 more. */
export interface Timeline {
  termEnd: string;
  readOnlyUntil: string;
  loginsBlockedUntil: string;
  deletionDoneBy: string;
}

const DAY = 86_400_000;

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY).toISOString().slice(0, 10);
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function timelineFor(termEnd: string): Timeline | null {
  if (!isIsoDate(termEnd)) return null;
  return {
    termEnd,
    readOnlyUntil: addDays(termEnd, 90),
    loginsBlockedUntil: addDays(termEnd, 180),
    deletionDoneBy: addDays(termEnd, 210),
  };
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
