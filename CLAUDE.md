# Quip Exit: bulk export of a whole Quip site to SharePoint, Google Drive or Notion, with folders, co…

Built by an automated studio. Read `SPEC.md` (what and why), `PLAN.md` (the task list) and this file (how) before changing anything.

## Rules for every contributor, human or agent

- Never commit secrets. Environment variable names go in `.env.example`, values never do.
- Payments stay in test mode until the owner goes live.
- Do not run `git commit` or `git push`. The studio orchestrator commits.
- `npm test` and `npm run build` must pass before work counts as done.
- Pages that answer a search query must be real tools or substantive answers, never thin filler.

## Stack, layout and commands

Working name **Packout** (the human picks the final brand; it must not start with "Quip").

### Stack
- **Astro 5**, static output, TypeScript. Plain CSS with custom properties, **no Tailwind, no UI kit, no icon pack** (see `DESIGN.md`).
- **Preact** islands (`@astrojs/preact`) only for interactive parts: the export tool and the deadline calculator.
- **fflate** for ZIP read/write (DOCX comment appendix, streamed export ZIP); **turndown** for HTML → Markdown (Notion preset, load with dynamic `import()`).
- **Vitest** (`vitest run`, node environment, `fake-indexeddb` for checkpoint tests).
- **Cloudflare Worker relay** in `worker/` (plain `export default { fetch }`, Web APIs only, tested with Vitest by calling `fetch(request, env)` directly). Stateless: no KV/R2/D1/cache bindings, never logs bodies or the `Authorization` header.
- Fonts self-hosted via `@fontsource/big-shoulders-stencil-display`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` (imported in `src/layouts/Base.astro`). Never Google Fonts or a CDN.

### Layout
```
src/
  layouts/Base.astro        page shell: fonts, tokens, header, footer with the not-affiliated line, CF analytics (only if token set)
  styles/tokens.css         colours, type scale, spacing, rules, perforation (all design tokens live here)
  styles/components.css     buttons, inputs, tick boxes, notices, ledger, waybill (PLAN task 1)
  components/               Logo, Barcode (deterministic inline SVG), LegalText, ExportTool.tsx (island)
  lib/url.ts                url(path): base-path-aware internal links. ALWAYS use it for hrefs and assets
  lib/barcode.ts            barcode bar widths from a seed
  lib/ratelimit.ts, lib/quip/, lib/crawl.ts, lib/export/*, lib/license.ts, lib/checkpoint.ts,
  lib/pricing.ts, lib/timeline.ts, lib/analytics.ts      (planned, see PLAN.md)
  mock/                     SYNTHETIC Quip fixtures + mock fetch (used by tests AND the "sample site" demo)
  content/legal/*.html      owner's Impressum/Datenschutz, installed by the studio; render unchanged, never edit
  pages/                    index, impressum, datenschutz, 404, and the page plan from SPEC section 8
worker/                     relay.ts + wrangler.toml (planned)
scripts/design-check.mjs    studio-owned; do not edit
test/                       *.test.ts, run once by `npm test`
```

### Commands
- `npm test` – Vitest once (no watch).
- `npm run build` – static build to `dist/`.
- `npm run build:preview` – same build under `SITE_URL=https://example.github.io SITE_BASE=/preview`; check that every link starts with `/preview/`.
- `npm run design-check` – the studio's check for generated-looking design habits. Must pass.
- Never run `astro dev`, `astro preview`, `wrangler dev` or `vitest` without `run`.

### Conventions
- Internal links and asset paths: `url('pricing/')`, never a bare `/pricing`. `SITE_URL`/`SITE_BASE` are read in `astro.config.mjs`.
- All export/crawl logic is framework-free TypeScript in `src/lib` taking injected `fetch`, clock and storage, so tests run against `src/mock` with no network.
- The Quip token lives only in memory (opt-in sessionStorage for resume) and only in the `Authorization` header. Never in URLs, localStorage, IndexedDB, analytics or the ZIP.
- Rate limits: at most 45 requests/minute and 700/hour per token; 503/429 = back off and retry.
- Prices come from `src/lib/pricing.ts` only (Free ≤ 20 docs, Site 149 €, Large 390 €). Stripe in test mode.
- Analytics: Cloudflare Web Analytics beacon only when `PUBLIC_CF_ANALYTICS_TOKEN` is set, plus content-free event counters via the relay. No cookies.
- "Quip" and "Salesforce" only descriptively; no logos or lookalike UI. No testimonials, customer counts or countdowns.
- Voice and visuals: follow `DESIGN.md` (parcel label on thermal paper; stencil counts; one red accent).
