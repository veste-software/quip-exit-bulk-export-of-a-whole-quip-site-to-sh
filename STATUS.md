# Quip Exit: bulk export of a whole Quip site to SharePoint, Google Drive or Notion, with folders, co…

**Stage:** seo · **Platform:** web · **Score:** 3.1/5 · **Spend:** $9.13

For teams whose Salesforce Quip subscription cannot renew after 2027-03-01: paste a Quip API token and pick folders. Documents become DOCX, HTML or Markdown and spreadsheets become XLSX; the folder tree is rebuilt, inline comments are saved and internal Quip links are rewritten to the new paths, ready for SharePoint, Google Drive or Notion. If it takes off, it becomes the reference 'leaving Quip' site, and the same export engine serves the next document-tool retirement.

**Why now:** Salesforce retires all Quip products: subscriptions cannot renew after 2027-03-01, then 90 days read-only, then logins blocked and data deleted; no bulk export in the UI and manual export drops comments (2026-05-08). Window: Each customer's deadline is their renewal date (no later than 2027-03-01) plus 90 days read-only, so the need peaks between now and mid-2027 and then ends.

## Needs you

- [ ] [task 1] Pick the brand name and buy the domain (do not start the name with 'Quip')
- [ ] [task 2] Create the Stripe account and the two products (149 EUR, 390 EUR), turn on tax ID collection and invoices, and add the live keys as STRIPE_SECRET_KEY, STRIPE_PRICE_SITE and STRIPE_PRICE_LARGE when going live
- [ ] [task 3] Deploy the Cloudflare Worker relay and the static site, and set LICENSE_SIGNING_SECRET and QUIP_HOST_ALLOWLIST
- [ ] [task 4] Run one real export with a Quip test account to confirm CORS behaviour, the enterprise host pattern, and that Notion's ZIP import keeps relative links
- [ ] [task 5] Add the site to Google Search Console and submit the sitemap
- [ ] [task 6] Pick the brand name and buy the domain (the name must not start with 'Quip')
- [ ] [task 7] Create the Stripe account and the two products (149 EUR, 390 EUR) with tax ID collection and invoices; when going live, set STRIPE_SECRET_KEY, STRIPE_PRICE_SITE and STRIPE_PRICE_LARGE
- [ ] [task 8] Deploy the Cloudflare Worker relay and the static site; set LICENSE_SIGNING_SECRET, QUIP_HOST_ALLOWLIST and PUBLIC_RELAY_URL (optionally PUBLIC_CF_ANALYTICS_TOKEN)
- [ ] [task 9] Run one real export with a Quip test account to confirm CORS behaviour, the enterprise API host pattern, and that Notion's ZIP import keeps relative links

## Recommendation

None yet. The Growth role gives one after launch.

## Metrics

No real numbers yet. Fill in `metrics.json` (Search Console, analytics, Stripe); agents never invent them.

## Monetisation

one-off (Free: unlimited dry run plus export of up to 20 documents. Site pass 149 EUR once (up to 2,000 docs, one Quip account, re-runs for 90 days). Large site pass 390 EUR once (up to 20,000 docs).)

## Target queries

- quip export all documents
- quip bulk export
- export entire quip site
- quip to sharepoint migration
- quip to onedrive
- quip to google drive
- quip to notion
- quip export comments
- quip end of life
- quip retirement 2027
- when will quip delete my data
- quip migration cost

## Alternatives found

- Salesforce in-product Quip-to-Slack-canvases flow (partial): Slack only, needs Slack Business+, tables capped at 300 cells, not yet in every tenant
- ClonePartner migration service (partial): Done-for-you project from $500; not self-serve
- Coda native Quip importer (partial): Only into Coda; grids lose formulas and relations

## Kill criteria

- Fewer than 150 organic clicks in Search Console by 2027-01-31: stop new work
- Zero paid exports by 2027-02-28: freeze and spend nothing more
- Salesforce ships a free bulk export to DOCX/HTML with comments for all plans: reassess within 14 days, then cut the price to 49 EUR or freeze
- More than 20% of paid runs fail or need a refund in any month: stop sales until fixed
- Planned sunset: stop sales 2028-03-31 and shut down the relay 2028-06-30

## Links

- Repo: https://github.com/veste-software/quip-exit-bulk-export-of-a-whole-quip-site-to-sh
- Preview (GitHub Pages, builds from main): https://veste-software.github.io/quip-exit-bulk-export-of-a-whole-quip-site-to-sh/

## History

- 2026-11-14 21:18 · scouted · ranked first in the daily pool (aggregate 2.45 of 5 by 2 independent rankers); the studio builds the day's best candidate whatever its score, and the prototype is how it is judged
- 2026-11-14 21:25 · specced · spec written
- 2026-11-15 15:43 · planned · scaffold and plan written
- 2026-11-15 16:15 · building · build started
- 2026-11-15 16:15 · seo · all planned tasks done
