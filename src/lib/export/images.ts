import type { QuipClient } from '../quip/client';

const BLOB = /src=(["'])(?:https?:\/\/[^/"']+)?\/blob\/([A-Za-z0-9]+)\/([A-Za-z0-9_-]+)[^"']*\1/g;

export function findBlobRefs(html: string): { threadId: string; blobId: string }[] {
  return [...html.matchAll(BLOB)].map((m) => ({ threadId: m[2], blobId: m[3] }));
}

export function sniffExt(b: Uint8Array): string {
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b[0] === 0x47 && b[1] === 0x49) return 'gif';
  if (b[0] === 0x52 && b[1] === 0x49) return 'webp';
  return 'png';
}

/**
 * Fetch every image once and store it as `<base>_files/<blobId>.<ext>` beside the document.
 * `dir` and `base` locate the HTML file; returned file paths are zip paths, src values are relative to the HTML file.
 */
export async function localizeImages(
  html: string,
  client: Pick<QuipClient, 'blob'>,
  where: { dir: string; base: string },
): Promise<{ html: string; files: { path: string; data: Uint8Array }[] }> {
  const files: { path: string; data: Uint8Array }[] = [];
  const done = new Map<string, string>();
  for (const ref of findBlobRefs(html)) {
    const key = `${ref.threadId}/${ref.blobId}`;
    if (done.has(key)) continue;
    const data = await client.blob(ref.threadId, ref.blobId);
    const name = `${ref.blobId}.${sniffExt(data)}`;
    const rel = `${encodeURIComponent(where.base)}_files/${name}`;
    files.push({ path: `${where.dir ? where.dir + '/' : ''}${where.base}_files/${name}`, data });
    done.set(key, rel);
  }
  const out = html.replace(BLOB, (_w, q: string, t: string, b: string) => `src=${q}${done.get(`${t}/${b}`)}${q}`);
  return { html: out, files };
}
