# QA report: Packout, review round 3

Verdict: **pass**. The round 2 blocker (false session-storage claim on `/security`) is fixed. No new blockers found.

## What I ran

| Check | Result |
|---|---|
| `npm test` | 54 passed in 9 files (includes `test/security-page.test.ts`, which guards the fixed claim) |
| `npm run build:preview` | 12 pages built; no `href`, `src` or `content` attribute in `dist/` has a bare root path (the only `src="/blob/..."` hits are strings inside mock-fixture JavaScript, not HTML) |
| `node scripts/design-check.mjs` | nothing found in 28 files |
| `npm run check:dist` | 49 files, clean |
| `npm audit --omit=dev` | 1 critical, 3 high, 1 low, all fixed only by the astro 5 to 7 major upgrade (unchanged; see warnings) |
| Round 2 blocker | `src/pages/security.astro:14` now says memory only, "Closing the tab ends everything". `dist/security/index.html` has 0 matches for "session storage". The only `sessionStorage` use in `src` is the licence (`src/lib/billing.ts`) |

## Blockers

None.

## Warnings (not blocking)

- **npm audit.** The advisories concern SSR, server islands, the image endpoint and dev servers. The product is static output and none of that code ships in `dist/`. Owner decision: upgrade `astro` and `@astrojs/preact`, then re-run test, build, build:preview, check:dist and design-check.
- **`SPEC.md:70` and `CLAUDE.md:54` still mention opt-in sessionStorage for the Quip token.** The code does not do this, and the public pages are now correct. Fix the docs at some point so nobody re-adds the claim.
- **Before Stripe, the buy button does not say the count must be repeated after paying** (`ExportTool.tsx` around line 330). The notice after payment is fine.
- **`/pricing` shows internal status:** "Until the owner has switched payments live, checkout only works in test mode." Remove when going live.
- **Home canonical has no trailing slash**, while the other pages have one. Harmless.
- **`.url` shortcuts in the SharePoint preset hold a relative target.** A human should test them on Windows and SharePoint.
- **Env var name:** code uses `LICENCE_SECRET`, SPEC says `LICENSE_SIGNING_SECRET`. The owner must set the name the code uses.
- **Relay CORS** reflects any Origin when `ALLOWED_ORIGIN` is unset. Set it in production.
- **Resume with a different selection** reuses checkpoint outputs keyed only by host, user and preset (edge case).
- **Free cap and licence checks are client-side**, by design (no accounts).
- **Real Quip API shape is unverified** (comment `author_id` against mock `author_name`). It needs a real-account run.
- **Visual fit was not checked in a browser** (none is available here). I read the styles and built HTML, and found no look-generated habits. Mobile first-screen fit at 390 px is unverified.

## Acceptance criteria

SPEC criteria 1 to 18 pass, as in round 2. Nothing in this round touched them except the `/security` text. The only open items need real accounts (Stripe live, real Quip site, Notion import) and are listed under human tasks.

## Money, legal, trust

Stripe is in test mode only. There are no keys in the repo. Prices come from `pricing.ts` (149 € and 390 €). Payment is one-off, so no cancel path is needed, and the refund policy is on `/pricing`. Impressum and Datenschutz render the company texts unchanged. There are no cookies, and the not-affiliated line is in every footer.
