import type { QuipClient } from './quip/client';
import type { ThreadType } from './quip/types';
import { findQuipLinks, idKey } from './export/links';
import { tierFor, type Tier } from './pricing';

export interface InvFolder {
  id: string;
  title: string;
  parentId: string | null;
}

export interface InvThread {
  id: string;
  title: string;
  type: ThreadType;
  html: string;
  owner: string;
  updatedUsec: number;
  folderIds: string[];
  /** Comments counted during the dry run, when this thread was in the sample. */
  commentCount?: number;
}

export interface Inventory {
  host: string;
  userId: string;
  userName: string;
  folders: InvFolder[];
  threads: InvThread[];
  counts: {
    folders: number;
    documents: number;
    spreadsheets: number;
    unsupported: number;
    multiFolder: number;
    links: number;
    linksUnresolved: number;
    comments: number;
    commentsSampled: boolean;
  };
  requestsEstimate: number;
  /** Hours at 700 requests an hour. */
  hoursEstimate: number;
  tier: Tier;
}

export const REQUESTS_PER_HOUR = 700;
export const COMMENT_SAMPLE_LIMIT = 50;

export function estimateRequests(inv: Pick<Inventory, 'threads' | 'folders'>): number {
  let n = 1 + Math.ceil(inv.folders.length / 10) + Math.ceil(inv.threads.length / 10);
  for (const t of inv.threads) {
    if (t.type !== 'document' && t.type !== 'spreadsheet') continue;
    n += 1 + Math.max(1, Math.ceil((t.commentCount ?? 0) / 100));
    n += (t.html.match(/\/blob\/[A-Za-z0-9]+\/[A-Za-z0-9]+/g) ?? []).length;
  }
  return n;
}

export interface DryRunOptions {
  host: string;
  onProgress?: (p: { folders: number; threads: number }) => void;
  signal?: AbortSignal;
}

export async function dryRun(client: QuipClient, opts: DryRunOptions): Promise<Inventory> {
  const user = await client.currentUser();
  const folders: InvFolder[] = [];
  const threadFolders = new Map<string, string[]>();
  const seenFolders = new Set<string>();

  const roots = [user.private_folder_id, ...(user.shared_folder_ids ?? [])].filter(Boolean);
  let queue = roots.map((id) => ({ id, parent: null as string | null }));
  while (queue.length) {
    if (opts.signal?.aborted) throw new DOMException('Stopped', 'AbortError');
    const fresh = queue.filter((q) => !seenFolders.has(q.id));
    fresh.forEach((q) => seenFolders.add(q.id));
    if (!fresh.length) break;
    const records = await client.folders(fresh.map((q) => q.id));
    queue = [];
    for (const q of fresh) {
      const rec = records[q.id];
      if (!rec) continue;
      folders.push({ id: q.id, title: rec.folder.title, parentId: q.parent });
      for (const c of rec.children) {
        if (c.folder_id) queue.push({ id: c.folder_id, parent: q.id });
        if (c.thread_id) {
          const list = threadFolders.get(c.thread_id) ?? [];
          list.push(q.id);
          threadFolders.set(c.thread_id, list);
        }
      }
    }
    opts.onProgress?.({ folders: folders.length, threads: threadFolders.size });
  }

  // Starred items add nothing new unless a thread lives nowhere else.
  if (user.starred_folder_id && !seenFolders.has(user.starred_folder_id)) {
    const rec = (await client.folders([user.starred_folder_id]))[user.starred_folder_id];
    for (const c of rec?.children ?? []) {
      if (c.thread_id && !threadFolders.has(c.thread_id)) threadFolders.set(c.thread_id, []);
    }
  }

  const ids = [...threadFolders.keys()];
  const records = await client.threads(ids);
  const threads: InvThread[] = [];
  for (const id of ids) {
    const r = records[id];
    if (!r) continue;
    threads.push({
      id,
      title: r.thread.title,
      type: r.thread.type,
      html: r.html ?? '',
      owner: r.thread.owner_name ?? user.name,
      updatedUsec: r.thread.updated_usec,
      folderIds: threadFolders.get(id) ?? [],
    });
  }
  opts.onProgress?.({ folders: folders.length, threads: threads.length });

  const exportable = threads.filter((t) => t.type === 'document' || t.type === 'spreadsheet');
  const sampled = exportable.length > COMMENT_SAMPLE_LIMIT;
  for (const t of exportable.slice(0, COMMENT_SAMPLE_LIMIT)) {
    if (opts.signal?.aborted) throw new DOMException('Stopped', 'AbortError');
    t.commentCount = (await client.messagesAll(t.id)).length;
  }

  const known = new Set(threads.map((t) => idKey(t.id)));
  let links = 0;
  let unresolved = 0;
  for (const t of exportable) {
    for (const l of findQuipLinks(t.html, opts.host)) {
      links++;
      if (!known.has(l.key)) unresolved++;
    }
  }

  const documents = threads.filter((t) => t.type === 'document').length;
  const inv: Inventory = {
    host: opts.host,
    userId: user.id,
    userName: user.name,
    folders,
    threads,
    counts: {
      folders: folders.length,
      documents,
      spreadsheets: threads.filter((t) => t.type === 'spreadsheet').length,
      unsupported: threads.length - exportable.length,
      multiFolder: threads.filter((t) => t.folderIds.length > 1).length,
      links,
      linksUnresolved: unresolved,
      comments: exportable.reduce((s, t) => s + (t.commentCount ?? 0), 0),
      commentsSampled: sampled,
    },
    requestsEstimate: 0,
    hoursEstimate: 0,
    tier: tierFor(exportable.length),
  };
  inv.requestsEstimate = estimateRequests(inv);
  inv.hoursEstimate = inv.requestsEstimate / REQUESTS_PER_HOUR;
  return inv;
}

export function formatDuration(hours: number): string {
  const minutes = Math.max(1, Math.round(hours * 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
