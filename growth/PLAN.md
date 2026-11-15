# Growth plan: Packout (working name), 30 days from launch

Base URL comes from `SITE_URL`. Nothing here is measured yet; there is no traffic data.

## What is in place (prep)
- Every target query in SPEC section 8 has its own page with a tool or substantive text: `/` (export all / bulk export), `/quip-to-sharepoint`, `/quip-to-google-drive`, `/quip-to-notion`, `/quip-export-comments`, `/quip-retirement-timeline` (with calculator), `/pricing`, `/security`.
- `Base.astro`: unique title and description per page, canonical, Open Graph and Twitter (summary) tags. JSON-LD: `WebApplication` with the three real prices on `/`, `BreadcrumbList` on the single-level content pages. No ratings, no FAQ markup (no page has a real FAQ block).
- `src/pages/sitemap.xml.ts` and `src/pages/robots.txt.ts`, both built from `SITE_URL` and `SITE_BASE`. If a page is added, add its path to `PATHS` in the sitemap file.
- Analytics: Cloudflare Web Analytics only if `PUBLIC_CF_ANALYTICS_TOKEN` is set (cookie-free), plus the event counters in `src/lib/analytics.ts` (dry_run_done, free_export_done, paid_export_done, export_failed, checkout_started). Funnel to read: visit, dry_run_done, checkout_started or free_export_done, paid_export_done.

## Known gaps, stated plainly
- No `og:image`: the brand art is SVG, which most social platforms do not render. A 1200x630 PNG needs to be exported from the brand kit (human task). Twitter card is `summary` until then.
- Queries that cannot be served honestly: none dropped. "quip to onedrive" is covered on the SharePoint page only; check that page names OneDrive in a heading once the first Search Console data arrives.
- Not verified: search volumes, and Notion's handling of relative links (the Notion page already says so; keep it that way until a human tests it).
- I could not run `npm run build`, `npm test` or `design-check` in this session (shell was denied). QA must run them before launch.

## Days 1 to 7: get found
1. Submit the sitemap in Google Search Console and Bing Webmaster Tools; use IndexNow via Bing (human).
2. Request indexing for `/`, `/quip-retirement-timeline`, `/quip-to-sharepoint` first.
3. Check in the live site that titles are not truncated and `robots.txt` points at the right sitemap.

## Days 8 to 21: legitimate distribution
- Salesforce Trailblazer Community: answer existing "how do I export Quip" threads with the specific steps and a link only where it directly answers the question. Disclose that you built the tool.
- r/salesforce, r/sysadmin, r/Notion: same rule. Search first; post only where someone asked. No cold posts that are ads.
- Hacker News "Show HN" is a fair fit once the relay's source is public: lead with the security design (token in memory, stateless relay), not the price.
- Write to the maintainers of the archived `sonnenkern/quip-export` repo with an issue-free approach: a polite note that a browser alternative exists, for the README pointer if they want it. Do not spam issues.
- Directories that fit: AlternativeTo (alternatives to Quip's export), Product Hunt only if the owner wants a launch day. Both human tasks.
- Contact authors of retirement guides that cite no exporter (the ONLYOFFICE and SalesforceBen pieces in SPEC section 3) with the timeline page as a sourced resource. One short email each, once.

## Days 22 to 30: next pages (only if Search Console shows demand)
Each must be a real answer, not a variant of an existing page:
1. "Quip spreadsheet to Excel export": what `/export/xlsx` keeps and loses (formulas, formats), with the manifest status values. Only if spreadsheet queries show impressions.
2. "Quip to Confluence" or "Quip to Slack canvas vs ZIP": a comparison page for people choosing a destination. Out of scope for presets, so write it as advice with the archive preset.
3. A "pre-migration checklist" for admins (inventory, token revocation, who owns what), linked from the timeline page.

## Conversion notes
- Paywall copy stays as designed: price appears after the dry run, "Export 20 for free" beside it. Do not add countdowns or scarcity; the real deadline is already on the timeline page.
- Refund policy is on `/pricing`; keep it visible.
- Change one thing at a time once live and record it in `growth/LOG.md`.

## Targets to review at day 30
Compare with SPEC section 9: 150 organic clicks by 2027-01-31, 15 paid exports by 2027-03-31.
