// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Previews are published under a sub-path (https://<owner>.github.io/<repo>/).
// The Pages workflow sets SITE_URL and SITE_BASE; a local build uses base "/".
const site = process.env.SITE_URL || 'https://packout.example';
const base = process.env.SITE_BASE || '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [preact()],
});
