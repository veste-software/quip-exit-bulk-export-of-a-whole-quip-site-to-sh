# QA report: Packout, review round 1

Verdict: **not passing yet**. Three blockers, all small and fixable. The core (crawl, export, presets, resume, licence, relay, preview build, legal pages, design) holds up.

## What I ran

| Check | Result |
|---|---|
| `npm test` | 49 passed (before my additions) |
| `npm run build`, `npm run check:dist`, `npm run size` | green; dist clean; 39.5 kB gzip JS (limit 80 kB) |
| `npm run build:preview` | every `href`, `src`, stylesheet, island `component-url`/`renderer-url` and every sitemap/robots entry starts with `/preview/`; no root-relative path found |
| `node scripts/design-check.mjs` | nothing found in 28 files |
| `npm audit --omit=dev` | **1 critical, 3 high** (see blocker 2) |
| `test/qa.test.ts` (added by QA) | 3 pass, **1 fails on purpose** (blocker 1) |

## Blockers

1. **`link-map.csv` status words do not match SPEC AC4e.** SPEC: "4 rows, 3 `resolved` and 1 `unresolved`". The code writes `rewritten` (`src/lib/export/links.ts:30,56`, type `LinkRow.status`). `test/qa.test.ts` "AC4e" fails with 0 `resolved` rows. Change the status value to `resolved` (and update `test/foundation.test.ts` and any `r.status === 'rewritten'` filter in `src/lib/export/run.ts`, plus the wording in the READMEs). Keep `test/qa.test.ts` as it is.
2. **`npm audit --omit=dev` shows a critical (astro <= 7.4.6) and high issues (sharp, zod) that have a fix** (`astro@7.4.12`, a major upgrade). Practical exposure is low: the site is fully static, with no server islands, SSR or dev server shipped. But the studio rule is no high or critical issue with a fix. Upgrade `astro` (and `@astrojs/preact` to its matching version), then re-run `npm test`, `npm run build`, `npm run build:preview`, `npm run check:dist`, `npm run design-check`. If the upgrade cannot be made to work, say exactly why in PLAN.md so the owner can decide.
3. **Silent state loss after payment.** `ExportTool.tsx` `useEffect` (session_id handling) saves the licence and shows nothing. The Stripe redirect reloads the page, so the inventory and the in-memory token are gone: the buyer lands on the empty form and does not know the payment worked or that they must paste the token again and re-run the count (about 30 requests per 100 documents). Fix: after `fetchLicence` succeeds, show a notice in the tool (for example NOTE: "Payment received. Paste your token again and count your documents; your licence for up to N documents applies.") and, before sending the buyer to Stripe, say in the stub that the count has to be repeated after paying. Also surface the failure case (already handled by the error phase).

## Warnings (not blocking)

- **Security page claims a feature that does not exist.** `src/pages/security.astro:14` says the token "can be kept in session storage" for resume if the user asks. No code does this; the token is memory only (safer). Delete the sentence, or build the opt-in. `src/pages/security.astro:25` also names `worker/relay.ts` but SPEC section 5 asks for a link to the relay source; there is no repo URL yet (human task).
- **`.url` shortcuts in the SharePoint preset hold a relative target** (`run.ts`, `URL=<relative path>`). Windows and SharePoint usually need an absolute URL in `.url` files, so these may not open after upload. Cannot be checked here; a human tests it (human task). Consider also writing the target path as text in the file.
- **`/pricing` says "Until the owner has switched payments live, checkout only works in test mode."** (`src/pages/pricing.astro:58`). This is internal status in public copy; remove it when going live.
- **Env var name differs from SPEC**: code and `.env.example` use `LICENCE_SECRET`; SPEC section 10 says `LICENSE_SIGNING_SECRET`. Consistent in the code, so only a note for the owner when setting secrets.
- **AC2 wording**: the primary button reads "Count my documents – free", as DESIGN.md says, not "Free dry run". The head row says "Consignment · free dry run". Acceptable.
- **The relay reflects any `Origin`** when `ALLOWED_ORIGIN` is unset (`worker/relay.ts:26`). Set `ALLOWED_ORIGIN` in production.
- **Resume with a different selection**: `IdbCheckpoint.latest` is keyed by host, user and preset only. If a run was interrupted with one set of picked documents, a later run with another selection reuses stored outputs whose links were rewritten against the old selection. Edge case; key the record on the selected id set or clear on a new selection.
- **Free-cap and licence checks are client-side** (the relay only confirms a licence). Anyone using devtools can lift the cap. This follows from the SPEC (no accounts, no server-side export), so it is accepted, not a bug.
- **Real Quip API shape is unverified**: the mock gives comments `author_name`; the real API returns `author_id` (PLAN builder note). Needs the real-account run.
- Exported HTML includes Quip document HTML unsanitised. It is the user's own content, opened locally, so low risk.
- Mobile header shows three links (DESIGN.md wants one under 480 px). Not visually checked: I did not run a browser, so the first-screen fit at 1280×800 and 390×844, the 360 px styleguide and the keyboard pass are **not verified by QA**.
- Home page "Step 1 / 2 / 3" columns are numbered steps. DESIGN.md prescribes them (rule-topped columns with drawn spot art, not icon cards), and the design check passes, so I do not count it as the stock layout. spot-1 appears on three pages.

## Acceptance criteria

1 pass (build, tests). 2 pass by reading the built page and source. 3 pass (`foundation.test.ts`). 4a–d, f, g pass; **4e fails** (status words). 5, 6 pass. 7 pass (fake clock, 2,000 calls; 503 retried). 8 pass (`resume.test.ts`, no refetch of the first 6). 9 pass (refuses 21; the 20 export works). 10 pass (tampered, expired, wrong host, wrong user). 11 pass (400 for a foreign host, no storage bindings, console capture). 12 pass (ZIP, URLs, analytics; IndexedDB records added by `test/qa.test.ts`). 13 pass. 14 pass (pages test, 400+ words each, tool linked). 15 pass (`LegalText.astro` uses the files with `set:html`, German and English). 16 pass (`check:dist`; the Cloudflare beacon renders only when a token is set). 17 pass. 18 pass (no testimonials, counts or countdowns; the timeline cites its three sources with dates and links).

## Other checks

- Search basics: all 12 pages have title, description, canonical; `/styleguide` is noindex; sitemap lists the 10 public pages; robots allows all and points to the sitemap; the tool pages carry their answer text in HTML.
- Stripe: no key in the repo, prices from `pricing.ts` (149 € / 390 €), one-off payment so no cancel path is needed; refund policy stated.
- Secrets: none in the repo or in the bundles (`.env.example` lists names only).
- Legal and trust: Impressum and privacy pages exist, no cookies, no third-party scripts in the default build, not-affiliated line in every footer.

## Round 1: blockers

- (medium) link-map.csv status values are 'rewritten'/'unresolved' but SPEC AC4e requires 3 'resolved' and 1 'unresolved'. Rename the status to 'resolved' (type LinkRow.status, rewriteLinks, run.ts stats filter, READMEs, foundation.test.ts). test/qa.test.ts 'AC4e' currently fails and must pass. [src/lib/export/links.ts:30,56; src/lib/export/run.ts; test/qa.test.ts]
- (medium) npm audit --omit=dev reports 1 critical (astro <=7.4.6) and 3 high (sharp, zod) with a fix available (astro@7.4.12, major upgrade). Exposure is low (static output) but the rule is no high or critical with a fix. Upgrade astro and @astrojs/preact, then re-run test, build, build:preview, check:dist and design-check; if impossible, document why in PLAN.md. [package.json / package-lock.json]
- (medium) After Stripe Checkout the page reloads and the tool shows the empty form with no confirmation. The inventory and in-memory token are lost and the buyer is not told the payment worked or that they must paste the token and re-run the count. Show a 'Payment received, paste your token again and count your documents; licence covers up to N' notice after fetchLicence succeeds, and say before checkout that the count is repeated. [src/components/ExportTool.tsx (session_id useEffect, buy())]
