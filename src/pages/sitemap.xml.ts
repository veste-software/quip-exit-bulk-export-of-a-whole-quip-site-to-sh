import type { APIRoute } from 'astro';

// Hand-listed on purpose: the site is eight content pages plus the legal pages.
const PATHS = [
  '',
  'quip-to-sharepoint/',
  'quip-to-google-drive/',
  'quip-to-notion/',
  'quip-export-comments/',
  'quip-retirement-timeline/',
  'pricing/',
  'security/',
  'impressum/',
  'datenschutz/',
];

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const urls = PATHS.map((p) => `  <url><loc>${new URL(`${base}/${p}`, site).href}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
