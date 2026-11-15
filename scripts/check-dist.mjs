// After a build: no cookies, no outside scripts, the not-affiliated line on every page, no Quip or Salesforce logos.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
if (!existsSync(dist)) {
  console.error('check-dist: run `npm run build` first.');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(dist);
const problems = [];
const beaconAllowed = Boolean(process.env.PUBLIC_CF_ANALYTICS_TOKEN);

for (const f of files) {
  if (f.endsWith('.html')) {
    const html = readFileSync(f, 'utf8');
    if (!/not affiliated with, endorsed by or sponsored by Salesforce or Quip/i.test(html)) problems.push(`${f}: missing the not-affiliated line`);
    for (const m of html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)) {
      const src = m[1];
      const external = /^(https?:)?\/\//.test(src);
      if (external && !(beaconAllowed && src.startsWith('https://static.cloudflareinsights.com/'))) problems.push(`${f}: external script ${src}`);
    }
  }
  if (f.endsWith('.html') || f.endsWith('.js')) {
    const text = readFileSync(f, 'utf8');
    if (text.includes('document.cookie')) problems.push(`${f}: uses document.cookie`);
    if (text.includes('localStorage')) problems.push(`${f}: uses localStorage`);
  }
}

for (const f of walk('public')) {
  if (/(quip|salesforce)[^/]*\.(svg|png|jpe?g|ico|webp)$/i.test(f) || /logo[^/]*(quip|salesforce)/i.test(f)) problems.push(`${f}: looks like a Quip or Salesforce logo`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`check-dist: ${files.length} files, clean.`);
