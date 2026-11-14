# SPEC: Packout, a browser-based bulk export for Quip sites (working name; product id quip-exit)

Decision: **build**, as a one-day prototype under the owner's daily-pick rule. Money verdict: **pays** (weak: monetization 3). The sharpest angle is described below. It is narrower than the Scout's pitch on purpose: no direct upload to SharePoint, Drive or Notion, only a complete, link-correct ZIP with destination presets.

> Naming: do not use "Quip" as the first word of the brand or domain. Quip is a Salesforce trademark. Use it only descriptively ("bulk export for Quip sites"), with a "not affiliated with Salesforce or Quip" line in the footer. "Packout" is a working name; the human picks the final name and domain.

---

## 1. Problem and users

Salesforce is retiring every Quip product. A team that leaves Quip has two options today. It can export documents one at a time from the File menu, which loses comments and leaves internal links pointing at quip.com, where they will break when the data is deleted. Or it can buy a done-for-you migration that starts with a sales call.

**Payer:** a team lead, department head or Salesforce admin at a small or mid-size company. Their team has a few hundred to a few thousand Quip documents, they have a corporate card, and they have been told to "get our docs out before Quip goes read-only". They are not developers. Their company laptop often blocks installing Node.js or npm packages, so the free command-line exporters are not an option for them.

**Core job:** "Give me everything my Quip account can see, in one download: the folder tree intact, every comment kept, links between documents still working, in a shape I can drop into SharePoint, Google Drive or Notion, plus a list that proves nothing was left behind."

## 2. Why now

- **Trigger (confirmed):** Salesforce announced that all Quip products are retiring and that subscriptions cannot be renewed after **2027-03-01**. When a term ends, the site is read-only for 90 days, then logins are blocked for 90 days, then the data is deleted over about 30 days (SalesforceBen, 2026-03-04).
- **Window:** each customer's real deadline is their own term end plus 90 days of read-only access. Terms renewed before 2027-03-01 can run into early 2028, so demand runs from now until about mid-2028 and peaks from Q1 to Q3 2027. Then it ends. This is a product with a planned end. The relay shuts down on 2028-06-30.
- **Why the gap is still open (2026-11-14):** Salesforce's only shipped tool is the one-click conversion to Slack canvases (Quip release notes, 2026-07-29). The "user and admin tools for exporting to third-party applications" it announced in March 2026 had not shipped as of ONLYOFFICE's 2026-08-28 guide: no workspace export, no admin toggle, no single ZIP. The best free CLI (sonnenkern/quip-export) was archived on 2026-08-30. The only announced self-serve competitor (export-quip.com) is in a waitlist beta with no published price.
- **Ship by: 2026-11-28.** Most fiscal-year renewals cluster around Q4 and Q1, and search pages need weeks to be indexed before the peak.

## 3. Evidence (opened and confirmed by the Product lead on 2026-11-14)

| Source | Date shown | What it confirms |
|---|---|---|
| https://www.salesforceben.com/salesforce-announces-end-of-life-for-quip/ | 2026-03-04 (updated 03-05) | Renewal cutoff 2027-03-01; 90 days read-only, 90 days blocked, about 30 days deletion; Salesforce plans export tools "to other third-party applications" and a Slack canvas flow |
| https://quip.com/release-notes | 2026-07-29 | Only 2026 entry: one-click Quip to Slack canvas migration. No bulk export entry |
| https://www.onlyoffice.com/blog/2026/08/how-to-migrate-from-quip-before-its-2027-retirement | 2026-08-28 | "No one-click workspace export, no admin toggle, no single ZIP"; the Bulk Export API can include conversations in DOCX/XLSX |
| https://clonepartner.com/blog/quip-end-of-life-playbook-2027-choosing-your-migration-destination.md | 2026-05-08 | Done-for-you migration at "one fixed price per project starting from $500" (**price proof**) |
| https://clonepartner.com/migrate/quip-to-sharepoint/ | undated, fetched 2026-11-14 | Done-for-you only: quote after a consultation, 1 to 5 business days, links remapped in a second pass |
| https://clonepartner.com/blog/quip-bulk-export-at-scale-rate-limits-checkpointing-runbook.md | 2026-09-29 | Per-token limits 50 req/min and 750 req/h; 600/min per company; throttling returns **HTTP 503**; `/1/threads/{id}/export/docx`, `/export/xlsx`; `/1/threads/{id}/messages` (100 per page, cursor); async bulk export needs Plus/Advanced; a personal token sees only what that user can see |
| https://www.export-quip.com/ | fetched 2026-11-14 | Competitor in waitlist beta (said to open end of Aug 2026); no price published; no named destinations |
| https://github.com/sonnenkern/quip-export | archived 2026-08-30 | Free MIT Node CLI: HTML with comments and images, DOCX without comments, folder export; 124 stars; no longer maintained |
| https://cdn.jsdelivr.net/npm/@anthragz/quip-export@1.1.0/README.md | v1.1.0 | Free MIT Node 18 CLI fork; DOCX/XLSX/HTML/Markdown; no link rewriting mentioned |
| https://api.npmjs.org/downloads/range/2026-05-01:2026-11-13/quip-export | 2026-05-01 to 11-13 | 1,622 downloads (about 170 to 335 a month) |
| https://api.npmjs.org/downloads/range/2026-05-01:2026-11-13/@anthragz/quip-export | same period | 1,508 downloads (peak 759 in August) |
| https://anchorify.io/blog/quip-deprecation-where-to-go | 2026-05-24 (updated 07-28) | "No bulk export in the Quip UI" |

**Not verified:** whether `platform.quip.com` sends CORS headers (assume it does not, hence the relay); search volumes; any Reddit or forum threads from users (a search found none; demand evidence is the vendor content wave plus npm downloads); the exact enterprise API host pattern; whether Notion's ZIP import turns relative links between Markdown files into page links (a human checks this on a real account).

## 4. Positioning

**The gap in one sentence:** nobody sells a self-serve, no-install way for a non-developer to get a whole Quip site out *with comments and working internal links* for a fixed, visible price. The options are an archived developer CLI, a Slack-only flow, or a $500+ service that starts with a call.

| Alternative | URL | What it lacks |
|---|---|---|
| Salesforce Quip to Slack canvas flow | https://quip.com/release-notes | Slack only; needs a paid Slack plan; nothing for SharePoint, Drive or Notion; no offline archive |
| Quip File > Export (built in) | n/a | One document at a time; drops comments; links still point at quip.com |
| sonnenkern/quip-export (free CLI) | https://github.com/sonnenkern/quip-export | Archived 2026-08-30; needs Node and a terminal; DOCX drops comments; no inventory or completeness report |
| @anthragz/quip-export (free CLI) | https://cdn.jsdelivr.net/npm/@anthragz/quip-export@1.1.0/README.md | Needs Node 18 and a terminal; no link rewriting mentioned; no audit manifest |
| ClonePartner | https://clonepartner.com/migrate/quip-to-sharepoint/ | Done-for-you from $500, quote after a call, days of turnaround |
| export-quip.com | https://www.export-quip.com/ | Waitlist beta, no published price, destinations not named |
| Coda / Superhuman Docs importer | (per ClonePartner playbook) | Only into Coda; grids lose formulas |

**What only this product does:**
1. Runs in the browser with a personal Quip token. Nothing to install, no account to create.
2. Gives a **free dry run** before you pay: counts folders, documents, spreadsheets, comments, internal links and documents that sit in several folders, and estimates the run time at Quip's limits.
3. Exports **every comment**, with author and timestamp: inline in the HTML, as a "Comments" appendix in the DOCX, and in one `comments.csv`.
4. **Rewrites links between Quip documents** to relative paths inside the export, and writes a `link-map.csv` (old Quip URL to new path) that a destination admin can use.
5. Writes a **completeness manifest** (`manifest.csv` plus an offline `index.html`) listing every document, its folder paths, owner, last-modified date, comment count and export status, as a record that nothing was left behind.
6. **Destination presets** that shape the same export for SharePoint/OneDrive, Google Drive, Notion or "archive only", each with step-by-step import instructions.
7. **Resumable:** at 750 requests an hour a big site takes hours. Progress is checkpointed in the browser (IndexedDB) and picks up after a reload or a closed laptop.

## 5. MVP scope

### In
- Static site plus one **stateless relay** (Cloudflare Worker) that forwards browser requests to the Quip API host and adds CORS headers. It never stores, logs or caches request or response bodies or the Authorization header. Only allowlisted Quip API hosts are reachable, so it is not an open proxy.
- Token entry: a personal access token from `https://<site>/dev/token`, with a short illustrated how-to. The token is held in memory (optionally sessionStorage, which the user can opt into for resume). It is never sent anywhere except through the relay to the Quip host.
- Host choice: `quip.com` or an enterprise Quip domain (the relay checks it against the allowlist).
- **Dry run (free, unlimited):** crawl the private, shared and starred folders and their subfolders (`/1/users/current`, `/1/folders/?ids=`, batched) and thread metadata. Show counts, documents in several folders, spreadsheet count, a sample of internal links found, an estimated duration and the price tier that applies.
- **Export:**
  - Documents: HTML (from the thread `html` field, with inline comment blocks and local images), DOCX (`/export/docx`, plus a generated Comments appendix if the API cannot embed conversations), optional Markdown (converted in the browser from HTML).
  - Spreadsheets: XLSX (`/export/xlsx`) plus HTML.
  - Images and blobs that the documents reference: downloaded and stored next to the document.
  - Comments: `/1/threads/{id}/messages`, paged with the cursor, into inline HTML, `comments.csv` and the DOCX appendix.
  - Folder tree rebuilt. A document in several folders is written once, at its first folder path. Each other path gets a small `.html` redirect stub (or `.url` shortcut in the SharePoint preset), and every path is listed in the manifest.
  - Link rewriting: any `https://<host>/<threadId>` or `/<threadId>/...` link to an exported thread becomes a relative path. Links to threads outside the export are kept and marked `unresolved` in `link-map.csv`.
  - Output: a streamed ZIP (or several ZIP parts of at most 1 GB each), plus `index.html` (browsable offline), `manifest.csv`, `link-map.csv`, `comments.csv` and `README.txt` with import steps for the chosen preset.
- **Rate-limit engine:** at most 45 requests per minute and 700 per hour per token. Treats HTTP 503 and 429 as throttling, with exponential backoff. Per-thread status is checkpointed in IndexedDB so the run resumes.
- **Free tier:** a full-fidelity export of up to 20 documents, chosen by the user, so they can judge the quality.
- **Paid unlock:** Stripe Checkout (test mode). On return, the Worker retrieves the Checkout Session, confirms it is paid, and issues a signed licence token (HMAC with `LICENSE_SIGNING_SECRET`) that carries the tier, the document cap, the Quip host plus user or company id, and an expiry (90 days). The client checks the token before exporting more than 20 documents.
- Pages from the page plan (section 8), `/pricing`, `/security` (how the token and data are handled, with a link to the relay source), `/impressum`, `/datenschutz`.
- Cookie-free analytics only (for example Cloudflare Web Analytics or none), plus a counter of dry runs, paid exports and failures, with no content and no tokens.

### Out (explicitly)
- Direct upload to SharePoint (Graph), Google Drive or Notion APIs: each needs an OAuth app, tenant consent or app verification. They are human-heavy, so they come later, and only if paid exports happen.
- Admin API or company-wide export (needs Quip Plus/Advanced and admin listing). Use of the async Bulk Export endpoint is optional; the Architect may add it if it is simple.
- Slides, Live Apps, Kanban boards, Salesforce data mentions (exported as their plain text or a placeholder, and listed in the manifest as "not exportable").
- Chat rooms and 1:1 messages.
- Version history.
- User accounts and logins; any server-side storage of customer content.
- Confluence, Coda and Slack destinations.
- Done-for-you service, calls or custom work.

## 6. Acceptance criteria (QA checks these without a live Quip account, a paid key or a store)

The build must ship a **mock Quip API** (fixtures for a small site: 3 folders, nested subfolder, 12 documents, 3 spreadsheets, 1 document in two folders, 1 thread with 120 comments needing cursor paging, 4 internal links including 1 to a thread outside the export, 2 images). The mock serves the endpoints the client uses. Tests run against it once (`npm test` with no watch mode).

1. `npm run build` and `npm test` pass.
2. The home page loads with no signup, explains the job in one screen, and shows the token field, the host choice and a "Free dry run" button.
3. Against the mock, the dry run shows exactly: 4 folders (including the subfolder), 12 documents, 3 spreadsheets, 1 multi-folder document, 4 internal links (1 unresolved), 120+ comments, an estimated duration, and the price tier.
4. Against the mock, a full export (with a test licence) produces a ZIP that contains:
   a. the folder tree matching the fixture;
   b. for each document, `.html` and `.docx`; for each spreadsheet, `.xlsx` and `.html`;
   c. `index.html` linking every exported item with relative links that resolve inside the unzipped folder;
   d. `manifest.csv` with one row per thread (columns at least: thread_id, title, type, primary_path, other_paths, owner, updated_at, comment_count, status);
   e. `link-map.csv` with 4 rows, 3 `resolved` and 1 `unresolved`;
   f. `comments.csv` containing all 120+ comments of the paged thread (proves cursor paging) with author and timestamp;
   g. images saved locally and referenced relatively in the HTML.
5. In the exported HTML, the 3 resolvable internal Quip links point to relative paths. No exported HTML contains a link to the mock host for an exported thread.
6. The multi-folder document is stored once; its second path holds a redirect stub, and the manifest lists both paths.
7. Rate limiting: a unit test with a fake clock shows that the client never sends more than 45 requests in any 60-second window or 700 in any hour. A mock 503 triggers backoff and a retry, not a failure.
8. Resume: a test interrupts an export halfway, rebuilds the client from the IndexedDB checkpoint (fake-indexeddb is acceptable), and finishes without re-fetching completed threads.
9. Without a licence, exporting more than 20 documents is blocked with a clear price message. The free 20-document export works.
10. The licence token: a valid token signed with a test secret unlocks the cap. A tampered, expired or wrong-host token is rejected. No real Stripe key is needed for the tests (Stripe calls are mocked).
11. Relay: a request to a host outside the allowlist returns 400. The relay code has no KV, R2, D1 or cache bindings and does not log request or response bodies or the `Authorization` header (checked by code inspection and a test that captures `console` output).
12. The token never appears in URLs, localStorage, analytics calls or the ZIP (test greps the generated ZIP and the stored IndexedDB records).
13. Each destination preset (SharePoint, Google Drive, Notion, Archive) changes the ZIP as specified (Notion: Markdown plus images, with relative links; SharePoint: DOCX/XLSX with `.url` shortcuts; Drive: DOCX/XLSX; Archive: everything) and puts preset-specific steps in `README.txt`.
14. The pages `/quip-to-sharepoint`, `/quip-to-google-drive`, `/quip-to-notion`, `/quip-export-comments`, `/quip-retirement-timeline`, `/pricing` and `/security` exist. Each has substantive content (at least 400 words or a working tool) and links to the tool.
15. `/impressum` and `/datenschutz` render the texts from `src/content/legal/` unchanged (German and English).
16. No cookies are set by default. No third-party trackers.
17. The footer says the product is not affiliated with Salesforce or Quip, and no Quip or Salesforce logo is used anywhere.
18. The site has no fake testimonials, no customer counts, no countdown timers and no "only X left" messages. The retirement timeline page cites its sources with links and dates.

## 7. Monetisation

**Model:** one-off payment per Quip site, paid by the team lead or admin with a card. This fits a job that happens once with a deadline. A subscription would be a dark pattern here.

| Tier | Price | What |
|---|---|---|
| Free | 0 | Unlimited dry runs; full export of up to 20 documents |
| Site pass | **149 EUR** once | Up to 2,000 documents from one Quip host and account; re-runs for 90 days; all presets |
| Large site pass | **390 EUR** once | Up to 20,000 documents; same terms. Bigger sites buy a pass per folder set; there are no custom deals |

- **The paywall** sits after the dry run. The "Export all N documents" button shows the price of the tier that the counted documents need. "Export 20 for free" sits next to it.
- **Price anchor:** ClonePartner's done-for-you migration "starting from $500" (2026-05-08). We are about a third of that, with no call and no wait.
- Stripe Checkout in test mode collects a business VAT ID and issues an invoice (procurement needs a receipt). No ads, no affiliate links.

**The channel and profit (the number the studio ranks by):**
- Channel: search. Assumed **1,500 visits in the first 12 months**, already ramped. A new domain on about 8 long-tail queries where ClonePartner holds most of the top spots. The demand floor is the roughly 3,100 npm downloads of the two free CLIs from May to November 2026 (about 5,600 a year), and those are developers alone.
- Assumed **1.2% visit-to-paid** for a B2B one-off with a free dry run. This is not a measured comparable.
- That gives **18 payers** at an average of about 165 EUR (mostly 149, a few at 390) = **about 2,970 EUR revenue**. Costs: Stripe fees about 110 EUR, domain about 15 EUR, Workers paid plan if needed about 55 EUR. Total about 180 EUR, so **about 2,800 EUR net**.
- **Cross-check:** no revenue or customer count for a comparable self-serve Quip exporter exists. export-quip.com is unpriced and ClonePartner publishes no customer numbers. The only check is the price anchor, so this is a single-method estimate. **I book 2,000 EUR expected** to reflect that, with **14,000 EUR upside** (the site becomes the reference "export Quip" page: about 6,000 visits at 2% = 120 payers at about 170 EUR, less costs).
- **5,000 EUR a year needs about 31 payers** at the 165 EUR average, so about 2,600 visits at 1.2%. In the base case the channel probably does not reach that. It does in the upside.

## 8. Target queries and page plan

| Query | Page | What the page is |
|---|---|---|
| quip export all documents; quip bulk export; export entire quip site | `/` | The tool itself: dry run, then export |
| quip to sharepoint migration; quip to onedrive | `/quip-to-sharepoint` | SharePoint preset plus exact steps (synced library drag-in, relative links, `.url` shortcuts), with the tool embedded |
| quip to google drive | `/quip-to-google-drive` | Drive preset plus steps (upload with "convert uploads" on; what happens to links; using `link-map.csv`) |
| quip to notion | `/quip-to-notion` | Notion preset plus steps (Markdown ZIP import; what does and does not carry over) |
| quip export comments; quip export with comments | `/quip-export-comments` | Why File > Export drops comments, how this tool keeps them (HTML inline, DOCX appendix, CSV); sample output screenshots from the mock |
| quip end of life; quip retirement 2027; when will quip delete my data | `/quip-retirement-timeline` | Sourced timeline plus a small calculator: enter your term-end date, get read-only, logins blocked and deletion dates |
| quip export tool price / quip migration cost | `/pricing` | Tiers, what the free run shows, comparison with a done-for-you service |
| is it safe to give my quip token | `/security` | Token handling, relay source code, no storage, how to revoke the token afterwards |

There are no generated page farms: eight hand-written pages.

## 9. Success metrics and kill criteria

- **Success by 2027-03-31:** at least 15 paid exports, and at least 30% of completed dry runs on sites with more than 20 documents turn into a paid export or a free 20-document export.
- **Kill or freeze criteria:**
  - Fewer than 150 organic clicks (Search Console) by 2027-01-31: stop new work and keep the site live unchanged.
  - Zero paid exports by 2027-02-28: freeze and spend nothing more.
  - Salesforce ships a free bulk export to DOCX/HTML that keeps comments for all plans: reassess within 14 days, and cut the price to 49 EUR or freeze.
  - More than 20% of paid runs fail or need a refund in any month: stop sales until fixed.
  - **Planned sunset:** stop sales on 2028-03-31; shut down the relay on 2028-06-30.

## 10. Legal and platform notes

- **Trademark:** use "Quip" and "Salesforce" only descriptively. No logos, no lookalike UI, footer disclaimer, and a brand name that does not start with "Quip".
- **Quip API use:** the user's own personal access token, used on their own instruction, for content they can already see. This is how Coda's importer and the open-source CLIs work. Respect the published rate limits and never ask for passwords.
- **Data protection (EU operator):** customer business documents pass through the relay in transit. The relay is stateless: no storage, no body or header logging, and only allowlisted Quip hosts. `/security` says so plainly. Analytics are cookie-free. The owner's privacy texts are shown unchanged.
- **Payments:** Stripe test mode only during the build. Invoices with VAT ID collection. Refunds go through the Stripe dashboard (one human click), and the refund policy is stated on `/pricing`: a refund if the export fails and cannot be fixed.
- **Environment variables (`.env.example`):** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SITE`, `STRIPE_PRICE_LARGE`, `LICENSE_SIGNING_SECRET`, `PUBLIC_RELAY_URL`, `QUIP_HOST_ALLOWLIST`.

## 11. Human tasks

1. Pick the brand name and buy the domain (no "Quip" at the start of the name).
2. Create the Stripe account, set up the two products (149 EUR and 390 EUR), turn on tax ID collection and invoices, and set the live keys as environment variables when going live.
3. Deploy the Cloudflare Worker relay and the static site under the owner's Cloudflare account, and set the secrets.
4. Run one real export with a Quip test account (any Quip account with a few documents and comments). Confirm the CORS behaviour, the enterprise host pattern, and that Notion's ZIP import keeps relative links.
5. Add the site to Google Search Console and submit the sitemap.

## 12. Look and feel

The visitor is a worried, busy team lead or admin with a deletion date in their calendar and a boss asking "did we get everything?". They want reassurance and a receipt, not excitement. The product is the digital cousin of a **removal company's packing inventory and bill of lading**: numbered cartons, stencilled box labels, a "FRAGILE: comments inside" sticker, a carbon-copy manifest the customer signs at the door. The mood is calm, procedural and accountable. Use kraft-cardboard and carbon-copy-blue tones, stencil numerals for the counts in the dry run, a packing-tape strip as the progress bar, and the manifest shown as a typewritten ledger with tick boxes. Avoid Salesforce blue, Quip's look and generic SaaS gradients.
