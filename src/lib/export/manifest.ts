import { escapeHtml, toCsv } from './csv';
import type { Preset } from './presets';

export interface ManifestRow {
  thread_id: string;
  title: string;
  type: string;
  primary_path: string;
  other_paths: string[];
  owner: string;
  updated_at: string;
  comment_count: number;
  status: 'ok' | 'not_exportable';
  /** The file a reader opens (zip path). */
  main_file: string;
}

export const MANIFEST_HEADER = ['thread_id', 'title', 'type', 'primary_path', 'other_paths', 'owner', 'updated_at', 'comment_count', 'status'];

export function manifestCsv(rows: ManifestRow[]): string {
  return toCsv(
    MANIFEST_HEADER,
    rows.map((r) => [r.thread_id, r.title, r.type, r.primary_path, r.other_paths.join(' | '), r.owner, r.updated_at, r.comment_count, r.status]),
  );
}

export const LINK_HEADER = ['source_thread_id', 'source_path', 'old_url', 'new_path', 'status'];

export const encodePath = (p: string): string => p.split('/').map(encodeURIComponent).join('/');

export function readmeText(preset: Preset, stats: { documents: number; comments: number; linksRewritten: number }): string {
  return [
    `PACKOUT EXPORT: ${preset.label}`,
    '',
    `Packed: ${stats.documents} documents, ${stats.comments} comments, ${stats.linksRewritten} links rewritten.`,
    '',
    'What is in this ZIP',
    '  index.html      offline packing list with a link to every document',
    '  manifest.csv    every document, its folder path, other folders, owner, date, status',
    '  link-map.csv    every link between documents: old address, new location, status',
    '  comments.csv    every comment with author and time',
    '',
    `How to import into ${preset.label}`,
    ...preset.steps.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    'Keep manifest.csv: it is your receipt.',
    'Packout is an independent tool and is not affiliated with Salesforce or Quip.',
    '',
  ].join('\n');
}

const typeLabel: Record<string, string> = { document: 'Document', spreadsheet: 'Spreadsheet', slides: 'Slides', chat: 'Chat' };

/** Offline packing list in the Packout look: flat colours, hard edges, no external files. */
export function indexHtml(rows: ManifestRow[], preset: Preset, stats: { comments: number; linksRewritten: number }): string {
  const sorted = [...rows].sort((a, b) => a.primary_path.localeCompare(b.primary_path));
  const body = sorted
    .map(
      (r) =>
        `<tr><td class="tick"><span class="box"></span></td><td><a href="${encodePath(r.main_file)}">${escapeHtml(r.title)}</a><br><span class="path">${escapeHtml(r.primary_path || '(top level)')}${r.other_paths.length ? ' · also in ' + escapeHtml(r.other_paths.join(', ')) : ''}</span></td><td>${typeLabel[r.type] ?? escapeHtml(r.type)}</td><td class="n">${r.comment_count}</td><td>${r.status === 'ok' ? 'packed' : 'not exportable'}</td></tr>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Packing list</title>
<style>
body{margin:0;background:#dfcba6;color:#1d2638;font:18px/1.55 "IBM Plex Sans","Helvetica Neue",Arial,sans-serif;padding:32px 16px}
main{max-width:64rem;margin:0 auto;background:#f7f3ea;border:2px solid #1d2638;box-shadow:4px 4px 0 #1d2638;padding:24px}
h1{font:800 44px/0.95 "Big Shoulders Stencil Display","Arial Narrow",sans-serif;text-transform:uppercase;margin:0 0 8px}
p.meta{font:14px "IBM Plex Mono","Courier New",monospace;text-transform:uppercase;letter-spacing:.1em;color:#4a5163;margin:0 0 24px}
table{width:100%;border-collapse:collapse}
th{font:500 14px "IBM Plex Mono","Courier New",monospace;text-transform:uppercase;letter-spacing:.1em;text-align:left;border-bottom:2px solid #1d2638;padding:8px 8px 8px 0}
td{border-bottom:1px solid #4a5163;padding:12px 8px 12px 0;vertical-align:top}
td.n{font-family:"IBM Plex Mono","Courier New",monospace;text-align:right}
.box{display:inline-block;width:20px;height:20px;border:2px solid #1d2638;background:#f7f3ea}
.path{font:14px "IBM Plex Mono","Courier New",monospace;color:#4a5163}
a{color:#1d2638}
</style></head>
<body><main>
<h1>Packing list</h1>
<p class="meta">${rows.length} items · ${stats.comments} comments · ${stats.linksRewritten} links rewritten · prepared for ${escapeHtml(preset.label)}</p>
<table><thead><tr><th></th><th>Document</th><th>Type</th><th>Comments</th><th>Status</th></tr></thead>
<tbody>
${body}
</tbody></table>
</main></body></html>
`;
}
