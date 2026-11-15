// Sums the gzip size of dist/_astro/*.js and fails above 80 kB.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dir = join('dist', '_astro');
const LIMIT = 80 * 1024;
if (!existsSync(dir)) {
  console.error('size: run `npm run build` first.');
  process.exit(1);
}
let total = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const n = gzipSync(readFileSync(join(dir, f))).length;
  total += n;
  console.log(`${(n / 1024).toFixed(1).padStart(6)} kB  ${f}`);
}
console.log(`total ${(total / 1024).toFixed(1)} kB gzip (limit 80 kB)`);
if (total > LIMIT) process.exit(1);
