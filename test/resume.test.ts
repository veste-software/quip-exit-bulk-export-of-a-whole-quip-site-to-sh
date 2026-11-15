import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { createMockQuipFetch } from '../src/mock/mockQuip';
import { MOCK_TOKEN } from '../src/mock/fixtures';
import { dryRun } from '../src/lib/crawl';
import { runExport } from '../src/lib/export/run';
import { IdbCheckpoint } from '../src/lib/checkpoint';
import { partBytes } from '../src/lib/export/zip';
import { makeClient } from './helpers';

describe('checkpoint and resume', () => {
  it('skips finished threads after an abort and ends with the same files', async () => {
    const inventory = await dryRun(makeClient(), { host: 'quip.com' });
    const meta = { host: 'quip.com', uid: inventory.userId, preset: 'archive' };
    const whole = await runExport({ client: makeClient(), inventory, preset: 'archive', cap: 100 });

    const cp = await IdbCheckpoint.create(meta);
    const ctl = new AbortController();
    await expect(
      runExport({ client: makeClient(), inventory, preset: 'archive', cap: 100, checkpoint: cp, signal: ctl.signal, onProgress: (p) => { if (p.done === 6) ctl.abort(); } }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    const resumed = (await IdbCheckpoint.latest(meta))!;
    expect(Object.keys(resumed.record.threadStatus)).toHaveLength(6);
    expect(JSON.stringify(resumed.record)).not.toContain(MOCK_TOKEN);

    const seen: string[] = [];
    const client = makeClient(createMockQuipFetch({ onRequest: (r) => seen.push(r.path) }));
    const res = await runExport({ client, inventory, preset: 'archive', cap: 100, checkpoint: resumed });
    for (const id of inventory.threads.slice(0, 6).map((t) => t.id)) expect(seen.filter((p) => p.includes(id))).toEqual([]);
    expect(seen.length).toBeGreaterThan(0);
    expect(Object.keys(unzipSync(partBytes(res.parts[0]))).sort()).toEqual(Object.keys(unzipSync(partBytes(whole.parts[0]))).sort());
    await resumed.clear();
    expect(await IdbCheckpoint.latest(meta)).toBeUndefined();
  });
});
