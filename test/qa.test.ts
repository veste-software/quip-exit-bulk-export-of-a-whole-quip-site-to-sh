import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildSite } from '../src/mock/fixtures';
import { createMockQuipFetch } from '../src/mock/mockQuip';
import { dryRun } from '../src/lib/crawl';
import { runExport } from '../src/lib/export/run';
import { partBytes } from '../src/lib/export/zip';
import { IdbCheckpoint } from '../src/lib/checkpoint';
import { makeClient } from './helpers';

// QA additions: acceptance criteria that the Builder's tests only cover indirectly.

async function archiveZip() {
  const client = makeClient();
  const inventory = await dryRun(client, { host: 'quip.com' });
  const res = await runExport({ client, inventory, preset: 'archive', cap: 100 });
  return unzipSync(partBytes(res.parts[0]));
}

describe('QA: SPEC section 6', () => {
  it('AC4a: every fixture folder exists as a directory in the ZIP', async () => {
    const zip = await archiveZip();
    const dirs = new Set(Object.keys(zip).flatMap((n) => n.split('/').slice(0, -1)));
    for (const f of Object.values(buildSite().folders)) expect(dirs.has(f.title), f.title).toBe(true);
  });

  it('AC4e: link-map.csv has 4 rows, 3 "resolved" and 1 "unresolved"', async () => {
    const zip = await archiveZip();
    const lines = strFromU8(zip['link-map.csv']).trim().split('\r\n');
    expect(lines).toHaveLength(5); // header + 4
    const status = lines.slice(1).map((l) => l.split(',').pop());
    expect(status.filter((s) => s === 'resolved')).toHaveLength(3);
    expect(status.filter((s) => s === 'unresolved')).toHaveLength(1);
  });

  it('AC4d: manifest.csv starts with the required columns', async () => {
    const zip = await archiveZip();
    expect(strFromU8(zip['manifest.csv']).split('\r\n')[0].startsWith(
      'thread_id,title,type,primary_path,other_paths,owner,updated_at,comment_count,status',
    )).toBe(true);
  });

  it('AC12: the token is in no IndexedDB record written by a checkpointed export', async () => {
    const TOKEN = 'TOKEN-idb-hygiene-51d2e8-unique';
    const client = makeClient(createMockQuipFetch({ token: TOKEN }), TOKEN);
    const inventory = await dryRun(client, { host: 'quip.com' });
    const cp = await IdbCheckpoint.create({ host: 'quip.com', uid: inventory.userId, preset: 'archive' });
    await runExport({ client, inventory, preset: 'archive', cap: 100, checkpoint: cp });
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open('packout-checkpoints', 1);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    let seen = 0;
    for (const name of Array.from(db.objectStoreNames)) {
      const all: unknown[] = await new Promise((res, rej) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      seen += all.length;
      const dump = JSON.stringify(all, (_k, v) => (v instanceof Uint8Array ? new TextDecoder('latin1').decode(v) : v));
      expect(dump).not.toContain(TOKEN);
    }
    expect(seen).toBeGreaterThan(10);
    await cp.clear();
  });
});
