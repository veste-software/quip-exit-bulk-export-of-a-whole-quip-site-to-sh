import type { QuipClient } from '../quip/client';
import type { Inventory, InvThread } from '../crawl';
import { FREE_CAP, formatEur, tierFor, type Tier } from '../pricing';
import { layout, join, relativePath, type ItemPath } from './paths';
import { rewriteLinks, type LinkRow } from './links';
import { appendCommentsToDocx, commentRows, commentsCsv, commentsHtml } from './comments';
import { localizeImages } from './images';
import { ZipWriter, type ZipPart } from './zip';
import { PRESETS, type PresetId } from './presets';
import { LINK_HEADER, indexHtml, manifestCsv, readmeText, type ManifestRow, encodePath } from './manifest';
import { escapeHtml, toCsv } from './csv';

export class LicenceRequiredError extends Error {
  constructor(public tier: Tier, public count: number) {
    super(
      `${count} documents are more than the free limit of ${FREE_CAP}. ` +
        (tier.priceEur === null
          ? 'This site is over 20,000 documents: export it in one pass per folder set.'
          : `The ${tier.name} tier covers up to ${tier.cap.toLocaleString('en-GB')} documents for ${formatEur(tier.priceEur)}.`),
    );
    this.name = 'LicenceRequiredError';
  }
}

export interface ThreadOutput {
  files: { path: string; data: Uint8Array }[];
  row: ManifestRow;
  links: LinkRow[];
  comments: string[][];
}

/** Persisted per-thread results, so an interrupted export can resume without re-fetching. */
export interface CheckpointStore {
  load(threadId: string): Promise<ThreadOutput | undefined>;
  save(threadId: string, out: ThreadOutput): Promise<void>;
}

export interface RunOptions {
  client: QuipClient;
  inventory: Inventory;
  preset: PresetId;
  /** Only these threads (free export: the user's pick). Default: all. */
  threadIds?: string[];
  /** Cap granted by a verified licence. Default: the free cap. */
  cap?: number;
  checkpoint?: CheckpointStore;
  onProgress?: (p: { done: number; total: number; title: string; requests: number }) => void;
  signal?: AbortSignal;
  maxPartBytes?: number;
}

export interface RunResult {
  parts: ZipPart[];
  files: string[];
  stats: { documents: number; comments: number; linksRewritten: number; linksUnresolved: number };
}

const exportable = (t: InvThread) => t.type === 'document' || t.type === 'spreadsheet';

async function toMarkdown(html: string): Promise<string> {
  const { default: Turndown } = await import('turndown');
  return new Turndown({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).turndown(html);
}

const redirectStub = (rel: string, title: string) =>
  `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${escapeHtml(encodePath(rel))}"><title>${escapeHtml(title)}</title><p>${escapeHtml(title)} is stored once. <a href="${escapeHtml(encodePath(rel))}">Open it here</a>.</p>\n`;

export async function runExport(o: RunOptions): Promise<RunResult> {
  const preset = PRESETS[o.preset];
  const inv = o.inventory;
  const picked = o.threadIds ? new Set(o.threadIds) : null;
  const selected = inv.threads.filter((t) => (!picked || picked.has(t.id)));
  const countable = selected.filter(exportable).length;
  const cap = o.cap ?? FREE_CAP;
  if (countable > cap) throw new LicenceRequiredError(tierFor(countable), countable);

  const { items } = layout(inv.folders, inv.threads);
  const ext = (t: InvThread) => (t.type === 'spreadsheet' ? 'xlsx' : 'docx');
  const pathsFor = (t: InvThread, it: ItemPath) => {
    const nativePath = join(it.dir, `${it.base}.${ext(t)}`);
    const htmlPath = preset.html === 'archive-dir' ? join('_archive', join(it.dir, `${it.base}.html`)) : join(it.dir, `${it.base}.html`);
    const mdPath = join(it.dir, `${it.base}.md`);
    return { nativePath, htmlPath, mdPath };
  };
  const mainOf = (t: InvThread, it: ItemPath) => {
    const p = pathsFor(t, it);
    return preset.main === 'html' ? p.htmlPath : preset.main === 'md' ? p.mdPath : p.nativePath;
  };

  // Where a link to each exported thread should point.
  const idToPath = new Map<string, string>();
  for (const t of selected) {
    if (!exportable(t)) continue;
    const it = items.get(t.id)!;
    // Documents with an HTML copy link to that copy (relative links work there); otherwise to the main file.
    idToPath.set(t.id, preset.main !== 'md' && preset.html !== 'none' ? pathsFor(t, it).htmlPath : mainOf(t, it));
  }

  const writer = new ZipWriter({ maxPartBytes: o.maxPartBytes });
  const rows: ManifestRow[] = [];
  const allLinks: LinkRow[] = [];
  const allComments: string[][] = [];

  let done = 0;
  for (const t of selected) {
    o.onProgress?.({ done, total: selected.length, title: t.title, requests: o.client.requestCount });
    if (o.signal?.aborted) throw new DOMException('Export stopped', 'AbortError');
    const it = items.get(t.id)!;
    let out = await o.checkpoint?.load(t.id);
    if (!out) {
      out = await buildThread(t, it);
      await o.checkpoint?.save(t.id, out);
    }
    for (const f of out.files) writer.add(f.path, f.data);
    rows.push(out.row);
    allLinks.push(...out.links);
    allComments.push(...out.comments);
    done++;
  }
  o.onProgress?.({ done, total: selected.length, title: '', requests: o.client.requestCount });

  async function buildThread(t: InvThread, it: ItemPath): Promise<ThreadOutput> {
    const p = pathsFor(t, it);
    const files: { path: string; data: Uint8Array }[] = [];
    const others = it.others.map((x) => join(x.dir, x.base));
    const base: Omit<ManifestRow, 'status' | 'comment_count' | 'main_file'> = {
      thread_id: t.id,
      title: t.title,
      type: t.type,
      primary_path: join(it.dir, it.base),
      other_paths: others,
      owner: t.owner,
      updated_at: new Date(Math.floor(t.updatedUsec / 1000)).toISOString(),
    };
    if (!exportable(t)) {
      const path = join(it.dir, `${it.base}.not-exportable.txt`);
      files.push({
        path,
        data: new TextEncoder().encode(`"${t.title}" (${t.id}) is a Quip ${t.type}. Quip's API cannot export this type. It is listed in manifest.csv as not_exportable.\n`),
      });
      return { files, row: { ...base, comment_count: 0, status: 'not_exportable', main_file: path }, links: [], comments: [] };
    }

    const messages = await o.client.messagesAll(t.id);
    const sourcePath = preset.main === 'native' && preset.html === 'none' ? p.nativePath : preset.main === 'md' ? p.mdPath : p.htmlPath;
    let html = t.html;
    if (preset.html !== 'none' || preset.main === 'md') {
      const htmlDir = sourcePath.split('/').slice(0, -1).join('/');
      const baseName = sourcePath.split('/').pop()!.replace(/\.[^.]+$/, '');
      const img = await localizeImages(html, o.client, { dir: htmlDir, base: baseName });
      html = img.html;
      files.push(...img.files);
    }
    const linked = rewriteLinks(html, inv.host, { id: t.id, path: sourcePath }, idToPath);
    const body = linked.html + commentsHtml(messages);

    if (preset.html !== 'none') {
      files.push({ path: p.htmlPath, data: new TextEncoder().encode(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(t.title)}</title>\n${body}\n`) });
    }
    if (preset.main === 'md') {
      files.push({ path: p.mdPath, data: new TextEncoder().encode(`${await toMarkdown(body)}\n`) });
    }
    if (t.type === 'document' && preset.main === 'md') {
      // Notion preset: Markdown only, no DOCX.
    } else if (t.type === 'document') {
      files.push({ path: p.nativePath, data: appendCommentsToDocx(await o.client.exportDocx(t.id), messages) });
    } else {
      files.push({ path: p.nativePath, data: await o.client.exportXlsx(t.id) });
    }

    const main = mainOf(t, it);
    for (const x of it.others) {
      const stubBase = join(x.dir, x.base);
      if (preset.shortcuts === 'html-stub') {
        files.push({ path: `${stubBase}.html`, data: new TextEncoder().encode(redirectStub(relativePath(`${stubBase}.html`, main), t.title)) });
      } else if (preset.shortcuts === 'url') {
        files.push({ path: `${stubBase}.url`, data: new TextEncoder().encode(`[InternetShortcut]\r\nURL=${encodePath(relativePath(`${stubBase}.url`, main))}\r\n`) });
      } else if (preset.shortcuts === 'md-stub') {
        files.push({ path: `${stubBase}.md`, data: new TextEncoder().encode(`[${t.title}](${encodePath(relativePath(`${stubBase}.md`, main))})\n`) });
      }
    }
    return {
      files,
      row: { ...base, comment_count: messages.length, status: 'ok', main_file: main },
      links: linked.rows,
      comments: commentRows(t, messages),
    };
  }

  const stats = {
    documents: rows.filter((r) => r.status === 'ok').length,
    comments: allComments.length,
    linksRewritten: allLinks.filter((l) => l.status === 'rewritten').length,
    linksUnresolved: allLinks.filter((l) => l.status === 'unresolved').length,
  };
  writer.add('manifest.csv', manifestCsv(rows));
  writer.add('link-map.csv', toCsv(LINK_HEADER, allLinks.map((l) => [l.source_thread_id, l.source_path, l.old_url, l.new_path, l.status])));
  writer.add('comments.csv', commentsCsv(allComments));
  writer.add('index.html', indexHtml(rows, preset, stats));
  writer.add('README.txt', readmeText(preset, stats));
  const parts = writer.finish();
  return { parts, files: writer.files, stats };
}
