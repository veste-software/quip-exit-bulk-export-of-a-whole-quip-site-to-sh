/**
 * Resume support on IndexedDB. Stores the finished output of every thread (files, manifest row, link and comment rows).
 * Never stores the Quip token.
 */
import type { CheckpointStore, ThreadOutput } from './export/run';

export interface RunRecord {
  runId: string;
  host: string;
  uid: string;
  preset: string;
  threadStatus: Record<string, 'done'>;
  createdAt: number;
}

const DB_NAME = 'packout-checkpoints';

function open(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('runs', { keyPath: 'runId' });
      req.result.createObjectStore('threads');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const wrap = <T,>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

export class IdbCheckpoint implements CheckpointStore {
  private constructor(private db: IDBDatabase, public record: RunRecord) {}

  static async create(meta: { host: string; uid: string; preset: string }, idb: IDBFactory = indexedDB): Promise<IdbCheckpoint> {
    const db = await open(idb);
    const record: RunRecord = { runId: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, ...meta, threadStatus: {}, createdAt: Date.now() };
    await wrap(db.transaction('runs', 'readwrite').objectStore('runs').put(record));
    return new IdbCheckpoint(db, record);
  }

  /** The newest unfinished run for this site, user and preset, if any. */
  static async latest(meta: { host: string; uid: string; preset: string }, idb: IDBFactory = indexedDB): Promise<IdbCheckpoint | undefined> {
    const db = await open(idb);
    const all = (await wrap(db.transaction('runs').objectStore('runs').getAll())) as RunRecord[];
    const hit = all.filter((r) => r.host === meta.host && r.uid === meta.uid && r.preset === meta.preset).sort((a, b) => b.createdAt - a.createdAt)[0];
    return hit ? new IdbCheckpoint(db, hit) : undefined;
  }

  async load(threadId: string): Promise<ThreadOutput | undefined> {
    if (!this.record.threadStatus[threadId]) return undefined;
    return (await wrap(this.db.transaction('threads').objectStore('threads').get(`${this.record.runId}/${threadId}`))) as ThreadOutput | undefined;
  }

  async save(threadId: string, out: ThreadOutput): Promise<void> {
    await wrap(this.db.transaction('threads', 'readwrite').objectStore('threads').put(out, `${this.record.runId}/${threadId}`));
    this.record.threadStatus[threadId] = 'done';
    await wrap(this.db.transaction('runs', 'readwrite').objectStore('runs').put(this.record));
  }

  async clear(): Promise<void> {
    const tx = this.db.transaction(['runs', 'threads'], 'readwrite');
    tx.objectStore('runs').delete(this.record.runId);
    const store = tx.objectStore('threads');
    for (const id of Object.keys(this.record.threadStatus)) store.delete(`${this.record.runId}/${id}`);
    await new Promise<void>((r) => { tx.oncomplete = () => r(); });
  }
}
