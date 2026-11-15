import { relativePath } from './paths';

/** Quip site URLs carry the first 11 characters of the thread id. */
export const idKey = (id: string): string => id.slice(0, 11);

export interface QuipLink {
  href: string;
  key: string;
  suffix: string;
}

function linkRegex(host: string): RegExp {
  const h = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`href=(["'])((?:https?://${h})?/([A-Za-z0-9]{11,12}))([/#?][^"']*)?\\1`, 'g');
}

export function findQuipLinks(html: string, host: string): QuipLink[] {
  const out: QuipLink[] = [];
  for (const m of html.matchAll(linkRegex(host))) {
    out.push({ href: m[2] + (m[4] ?? ''), key: idKey(m[3]), suffix: m[4] ?? '' });
  }
  return out;
}

export interface LinkRow {
  source_thread_id: string;
  source_path: string;
  old_url: string;
  new_path: string;
  status: 'rewritten' | 'unresolved';
}

const anchorOf = (suffix: string) => {
  const i = suffix.indexOf('#');
  return i >= 0 ? suffix.slice(i) : '';
};

/** Turn links to exported threads into relative paths; leave all others untouched. */
export function rewriteLinks(
  html: string,
  host: string,
  source: { id: string; path: string },
  idToPath: Map<string, string>,
): { html: string; rows: LinkRow[] } {
  const byKey = new Map<string, string>();
  for (const [id, p] of idToPath) byKey.set(idKey(id), p);
  const rows: LinkRow[] = [];
  const out = html.replace(linkRegex(host), (whole, q: string, href: string, id: string, suffix?: string) => {
    const old = href + (suffix ?? '');
    const target = byKey.get(idKey(id));
    if (!target) {
      rows.push({ source_thread_id: source.id, source_path: source.path, old_url: old, new_path: '', status: 'unresolved' });
      return whole;
    }
    const rel = relativePath(source.path, target).split('/').map(encodeURIComponent).join('/') + anchorOf(suffix ?? '');
    rows.push({ source_thread_id: source.id, source_path: source.path, old_url: old, new_path: rel, status: 'rewritten' });
    return `href=${q}${rel}${q}`;
  });
  return { html: out, rows };
}
