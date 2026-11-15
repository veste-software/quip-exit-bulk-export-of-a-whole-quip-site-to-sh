/**
 * Base-path aware internal links. Previews live under /<repo>/ (SITE_BASE), production at /.
 * Always build internal hrefs and asset paths with `url()`, never with a bare "/path".
 */
export function joinBase(base: string, path = ''): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const p = path.replace(/^\/+/, '');
  return `${b}${p}`;
}

export function url(path = ''): string {
  return joinBase(import.meta.env.BASE_URL ?? '/', path);
}
