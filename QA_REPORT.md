# QA report: Packout, review round 2

Verdict: **not passing yet**, one small blocker. Round 1 blockers 1 (link-map status) and 3 (payment-received notice) are fixed. Round 1 blocker 2 (npm audit) is still open and is downgraded to a warning plus a human task (reason below).

## What I ran

| Check | Result |
|---|---|
| `npm test` | 53 passed (includes `test/qa.test.ts`, AC4e now green) |
| `npm run build:preview` | 12 pages built; no `href`, `src`, `content`, island URL with a root path; every sitemap entry and the robots sitemap line start with `/preview/` |
| `npm run check:dist`, `npm run size` | clean (49 files); 39.7 kB gzip JS (limit 80 kB) |
| `node scripts/design-check.mjs` | nothing found in 28 files |
| `npm audit --omit=dev` | still 1 critical, 3 high, 1 low, all fixed only by the astro 5 to 7 major upgrade |
| Built pages | all 12 have a title, description and canonical; `/styleguide` is noindex; sitemap lists the 10 public pages |

## Blockers

1. **`/security` describes a feature that does not exist.** `src/pages/security.astro:14` says "if you ask for it, the token can be kept in session storage". No code stores the Quip token anywhere (the only `sessionStorage` use is the licence, `src/lib/billing.ts`). A page whose whole job is to say exactly what happens to the token must not be inaccurate. Delete the sentence "The one optional exception is resume: ... session storage, which the browser deletes when the tab closes." and keep "Closing the tab ends everything." Also check `/pricing`, README and the relay page for the same claim.

## Warnings (not blocking)

- **npm audit (was round 1 blocker 2).** Astro 5 reports 1 critical and sharp, zod, esbuild advisories; the fix is `astro@7.4.12`. The advisories concern SSR, server islands, spread props with untrusted data, the image endpoint and dev servers. The product is fully static output with no SSR and nothing from these packages in `dist/`, so I judge the shipped risk as nil. PLAN.md records that the Builder could not run the upgrade. I treat it as an owner decision (human task). If the owner wants zero audit findings, upgrade `astro` and `@astrojs/preact`, then re-run test, build, build:preview, check:dist and design-check.
- **Before Stripe, the buy button does not say the count must be repeated after paying.** `ExportTool.tsx:330`. The notice after payment (`:234`) is good, but round 1 also asked for a line next to the button, for example "After payment the page reloads; you will count again once."
- **`/pricing` shows internal status:** `src/pages/pricing.astro:58` "Until the owner has switched payments live, checkout only works in test mode." Remove when going live.
- **Home canonical has no trailing slash** (`https://.../preview`, other pages have one). Harmless; make it consistent.
- **`.url` shortcuts in the SharePoint preset hold a relative target.** Windows and SharePoint may need absolute URLs; a human tests it.
- **Env var name:** code uses `LICENCE_SECRET`, SPEC says `LICENSE_SIGNING_SECRET`. Consistent in code; the owner must set the code's name.
- **Relay CORS** reflects any Origin when `ALLOWED_ORIGIN` is unset; set it in production.
- **Resume with a different selection** reuses checkpoint outputs keyed only by host, user and preset; edge case.
- **Free cap and licence checks are client-side** by design (no accounts); accepted.
- **Real Quip API shape unverified** (comment `author_id` vs mock `author_name`); needs the real-account run.
- **Visual fit was not checked in a browser** (no browser is available). I read `DESIGN.md`, the stylesheets, `index.astro` and the built HTML: fonts are self-hosted (Big Shoulders Stencil, IBM Plex), flat colour, hard offset shadows, one `--radius` token, no gradients or blur, no icon pack, no left-border callouts. The home page is a tool-first screen with a ledger table and drawn art, not the stock hero plus three icon cards. The three-column "Step 1/2/3" strip is prescribed by DESIGN.md and uses drawn pictures, so I do not count it as the stock layout. Mobile first-screen fit at 390 px is unverified.

## Acceptance criteria

1 pass. 2 pass (token field, host choice, count button; wording "Count my documents – free" per DESIGN.md). 3 pass. 4a–g pass (4e now 3 `resolved`, 1 `unresolved`). 5, 6, 7, 8, 9, 10, 11, 12, 13 pass (tests). 14 pass (pages exist, tool linked). 15 pass (legal text rendered unchanged via `LegalText.astro`). 16 pass (no cookies; beacon only with a token set). 17 pass. 18 pass (no testimonials, counts or countdowns; timeline cites sources). Only the real-account steps (Stripe live, real Quip, Notion import) are left to the owner.

## Money, legal, trust

Stripe test mode only; no keys in the repo; prices come from `pricing.ts` (149 € / 390 €); one-off payment, so no cancel path; refund policy on `/pricing`. Impressum and Datenschutz pages exist; no cookies; not-affiliated footer line on every page.

## Round 2: blockers

- (medium) The security page says the Quip token can optionally be kept in session storage for resume. No code does this; the token is memory only. Delete the sentence 'The one optional exception is resume: if you ask for it, the token can be kept in session storage, which the browser deletes when the tab closes.' and keep 'Closing the tab ends everything.' Check README and other pages for the same claim. [src/pages/security.astro:14]
