import { describe, it, expect } from 'vitest';
import { buildSite, MOCK_TOKEN } from '../src/mock/fixtures';
import { createMockQuipFetch } from '../src/mock/mockQuip';
import { RateLimiter, withRetry, type Clock } from '../src/lib/ratelimit';
import { QuipClient } from '../src/lib/quip/client';
import { dryRun } from '../src/lib/crawl';
import { tierFor } from '../src/lib/pricing';
import { layout, relativePath, safeName } from '../src/lib/export/paths';
import { findQuipLinks, rewriteLinks } from '../src/lib/export/links';

import { fakeClock, makeClient } from './helpers';

describe('fixtures', () => {
  const site = buildSite();
  it('has the documented shape', () => {
    const t = Object.values(site.threads);
    expect(t.filter((x) => x.type === 'document')).toHaveLength(12);
    expect(t.filter((x) => x.type === 'spreadsheet')).toHaveLength(3);
    expect(Object.keys(site.folders)).toHaveLength(4);
    const inTwo = Object.values(site.threads).filter(
      (th) => Object.values(site.folders).filter((f) => f.threads.includes(th.id)).length === 2,
    );
    expect(inTwo).toHaveLength(1);
    expect(Object.values(site.messages).map((m) => m.length)).toEqual([120]);
    const html = t.map((x) => x.html).join('');
    expect(findQuipLinks(html, 'quip.com')).toHaveLength(4);
    expect(html.match(/\/blob\/\w+\/\w+/g)).toHaveLength(2);
  });
});

describe('mock + client', () => {
  it('pages 120 comments in 2 requests and rejects a missing token', async () => {
    const seen: string[] = [];
    const client = makeClient(createMockQuipFetch({ onRequest: (r) => seen.push(r.path) }));
    const msgs = await client.messagesAll('DOC00000001');
    expect(msgs).toHaveLength(120);
    expect(seen.filter((p) => p.includes('/messages'))).toHaveLength(2);
    const res = await createMockQuipFetch()('https://x.test/api/1/users/current');
    expect(res.status).toBe(401);
  });
  it('wrong token fails with 401', async () => {
    await expect(makeClient(createMockQuipFetch(), 'nope').currentUser()).rejects.toMatchObject({ status: 401 });
  });
});

describe('rate limiter', () => {
  it('never exceeds 45/min and 700/h over 2000 calls', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ clock });
    const stamps: number[] = [];
    for (let i = 0; i < 2000; i++) {
      await limiter.acquire();
      stamps.push(clock.t);
    }
    let j = 0;
    let k = 0;
    for (let i = 0; i < stamps.length; i++) {
      while (stamps[i] - stamps[j] >= 60_000) j++;
      while (stamps[i] - stamps[k] >= 3_600_000) k++;
      expect(i - j + 1).toBeLessThanOrEqual(45);
      expect(i - k + 1).toBeLessThanOrEqual(700);
    }
  });
  it('resolves after two 503s', async () => {
    const clock = fakeClock();
    let n = 0;
    const res = await withRetry(async () => (n++ < 2 ? new Response('', { status: 503 }) : new Response('ok')), { clock });
    expect(res.ok).toBe(true);
    expect(n).toBe(3);
    await expect(withRetry(async () => new Response('', { status: 404 }), { clock })).rejects.toMatchObject({ status: 404 });
  });
});

describe('dry run', () => {
  it('inventories the mock site', async () => {
    const inv = await dryRun(makeClient(), { host: 'quip.com' });
    expect(inv.counts).toMatchObject({ folders: 4, documents: 12, spreadsheets: 3, multiFolder: 1, links: 4, linksUnresolved: 1, commentsSampled: false });
    expect(inv.counts.comments).toBeGreaterThanOrEqual(120);
    expect(inv.hoursEstimate).toBeGreaterThan(0);
    expect(inv.tier.id).toBe('free');
    expect(tierFor(21).id).toBe('site');
    expect(tierFor(2001).priceEur).toBe(390);
    expect(tierFor(20001).priceEur).toBeNull();
  });
});

describe('paths and links', () => {
  it('sanitises, dedupes and gives both paths of a multi-folder doc', async () => {
    expect(safeName('a/b:c*?"<>|d.')).toBe('a b c d');
    expect(relativePath('A/B/x.html', 'A/C/y.html')).toBe('../C/y.html');
    expect(relativePath('x.html', 'A/y.html')).toBe('A/y.html');
    const inv = await dryRun(makeClient(), { host: 'quip.com' });
    const { items } = layout(inv.folders, inv.threads);
    const multi = items.get('DOC00000003')!;
    expect(multi.dir).toBe('Private');
    expect(multi.others[0].dir).toBe('Private/Meetings');
    const l = layout([{ id: 'f', title: 'F', parentId: null }], [
      { id: '1', title: 'Same', folderIds: ['f'] }, { id: '2', title: 'same', folderIds: ['f'] },
    ]);
    expect(l.items.get('2')!.base).toBe('same (2)');
  });
  it('rewrites 3 of 4 links', async () => {
    const inv = await dryRun(makeClient(), { host: 'quip.com' });
    const map = new Map(inv.threads.map((t) => [t.id, `Private/${t.title}.html`]));
    const t = inv.threads.find((x) => x.id === 'DOC00000001')!;
    const out = rewriteLinks(t.html, 'quip.com', { id: t.id, path: 'Private/Onboarding guide.html' }, map);
    expect(out.rows.filter((r) => r.status === 'rewritten')).toHaveLength(3);
    expect(out.rows.filter((r) => r.status === 'unresolved')).toHaveLength(1);
    expect(out.html).not.toContain('quip.com/DOC');
    expect(out.html).toContain('#plan');
  });
});
