# DESIGN: Packout

The brand kit is in `src/styles/brand.css` (tokens and base styles), `public/brand/logo.svg`, `public/favicon.svg` and `public/art/*.svg`. This file says how to use them. If something here and the CSS disagree, the CSS wins. Report it.

## 1. The idea: a shipping label taped to a removal carton

Packout is the digital cousin of a **removal carton on moving day**. The carton has a shipping label taped to its side, a packing list in a clear pouch and a red FRAGILE sticker. **The whole page is the side of the carton** (flat kraft board). **The tool is the shipping label**: label stock, a 2 px carbon edge, a hard offset shadow, and two pieces of brown packing tape holding its top corners. Everything else follows from that object:

- the free dry run is the **inventory**: stencilled counts, a barcode, a consignment number;
- the export is the carton being **taped shut**: a strip of packing tape is the progress bar;
- the result is the **packing list** the customer keeps: a ledger with green ticks and a PACKED stamp;
- comments are the **fragile** part. Red always means comments or the one action. Nothing else is red.

What we kept from the Architect: the stencil counts, the waybill and its perforated stub, the FRAGILE sticker, the hard offset shadow, the three Plex/Big Shoulders faces and the voice. What we changed: grey thermal paper became **kraft carton** (no other product looks like a cardboard box; grey off-white looked like any SaaS page), pure-black ink became **carbon-copy blue-black** (the spec's "carbon copy", without the SaaS blue), and a green **tally** signal colour was added for "done and checked", so red is no longer doing two jobs.

## 2. Name and mark

- **Name:** Packout (working name. The human picks the final one, and it must not start with "Quip"). In the removal trade a "pack-out" is the day the movers pack everything and carry it out. That is exactly the job.
- **Mark, "the taped seam"** (`public/brand/logo.svg`, 64×64): a carton seen from above. One strip of packing tape seals the seam and is torn off with a zigzag below the edge. A small red square is the fragile sticker. Three shapes, readable at 16 px (`public/favicon.svg` drops the zigzag). In the mark the box is tape-brown and the tape is label stock, so it stays crisp on any browser tab. In the illustrations, cartons are corrugate and tape is brown.
- **Wordmark:** "PACKOUT" set in HTML beside the mark: Big Shoulders Stencil Display 800, 28 px (24 px under 480 px), letter-spacing 0.04em, carbon. Mark 36 px high, gap 10 px. The mark never contains text and is never recoloured.
- `src/components/Logo.astro` holds the inline version of the mark (same shapes, CSS variables).

## 3. Palette (flat, exact)

| Name | Token | Hex | Use | Contrast |
|---|---|---|---|---|
| **Carton** | `--paper` | `#dfcba6` | The dominant surface: every page background | carbon on carton 9.5:1 |
| **Label stock** | `--label` | `#f7f3ea` | Raised surfaces: the tool label, packing lists, inputs, ledger panels | carbon on label 13.7:1 |
| **Carbon** | `--ink` | `#1d2638` | All text, rules, outlines, the folders in illustrations | – |
| Faded carbon | `--ink-faded` | `#4a5163` | Secondary text, help text, perforation | 5.0:1 on carton, 7.2:1 on label |
| **Fragile red** | `--accent` | `#c2321b` | The accent, used sparingly: the one primary button per screen, the FRAGILE sticker, comment notes in art, the focus ring | label text on red 5.0:1 |
| Fragile red, text | `--accent-ink` | `#9e2a14` | Red as text: errors, the STOPPED tag, link hover | 4.7:1 on carton, 6.8:1 on label |
| **Tally green** | `--signal` | `#285e41` | The signal: ticks, PACKED stamp, "done", "resolved", a filled token slot | 4.8:1 on carton, 6.9:1 on label |
| Tape | `--tape` | `#a8743c` | Packing tape pieces, the progress strip, text selection. **Never behind text** | – |
| Corrugate | `--corrugate` | `#c9b085` | Flat shadows in art, disabled button fill, carton faces in art | carbon on corrugate 7.2:1 |

No white, no black, no greys outside this table, no blue except the carbon ink. **No gradients anywhere**: not in CSS, not in SVG, not in shadows. The only shadows are hard offsets with 0 blur (`--shadow-label`, `--shadow-btn`).

## 4. Type (self-hosted, imported at the top of `brand.css`)

| Role | Face | npm package | Weights |
|---|---|---|---|
| Display: headlines, stencilled counts, stamp, wordmark | **Big Shoulders Stencil Display** | `@fontsource/big-shoulders-stencil-display` | 800 |
| Text: body, buttons, form text, h3 | **IBM Plex Sans** | `@fontsource/ibm-plex-sans` | 400, 400 italic, 600 |
| Print: label fields, the token, figures, mono tags | IBM Plex Mono (same family as the text face) | `@fontsource/ibm-plex-mono` | 400, 500 |

| Token | Size | Use |
|---|---|---|
| `--step--1` | 14 px | Mono tags, UPPERCASE, tracked 0.1em ("PERSONAL ACCESS TOKEN", "FROM", "TO") |
| `--small` | 17 px | Help text, footer, captions |
| `--step-0` | 18 px | Body, inputs, buttons |
| `--step-1` | 22 px | Lead sentence, h3 (Plex Sans 600, normal case) |
| `--step-2` | 30–40 px | h2, stencil, uppercase |
| `--step-3` | 40–64 px | Stencilled counts in the dry-run result (`.count`) |
| `--step-4` | 40–72 px | h1, stencil, uppercase, line-height 0.95 |

Every counted or priced number uses `.num` (Plex Mono, tabular figures). Use curly quotes, en dashes for ranges, "×" for multiplication, "1,204", "149 €", "1 March 2027".

## 5. Grid and spacing

- 8 px base: `--s1` 8, `--s2` 16, `--s3` 24, `--s4` 32, `--s6` 48, `--s8` 64, `--s12` 96. No other gaps.
- Content max width 72 rem (1152 px), side padding 24 px (16 px under 480 px). A 12-column grid with 24 px gutters: the first screen is columns 1–6 copy, 7–12 tool (`.first-screen`, 1.08fr / 1fr, 48 px gap).
- Long pages: an 8-column text block (`--measure: 64ch`) with an optional 3-column left rail of mono tags ("STEP 1 / SHAREPOINT"). Sections are separated by the corrugated edge (`hr.corrugated`) or a 2 px carbon rule, never by boxes around everything. One label-stock panel per page at most (the tool, or a ledger).
- Controls are 52 px high (`--control-h`), tick boxes 24 px inside a 52 px row. Corner radius is 2 px everywhere (`--radius`), circles only for perforation notches.

## 6. Signature element: the taped label

`.label` in `brand.css`: label stock, 2 px carbon border, `4px 4px 0` carbon shadow, and two **tape pieces** (`::before`/`::after`, tape-brown, zigzag ends via `clip-path`, rotated −5° and 4°) over the top corners. It is used for the tool on every page that has it, the 404 ("undeliverable") and nothing else. Inside it, the waybill:

1. **Head row** (`.label__head`, mono tags): `FROM quip.com` · `TO SharePoint` and the consignment number `PKO-4F2-81C` on the right, over a 2 px rule.
2. **Stencilled counts** (`.count`) in a 3 × 2 grid: FOLDERS, DOCUMENTS, SPREADSHEETS, COMMENTS, LINKS, a mono caption under each. Exceptions as short mono lines below: "1 document lives in 2 folders", "1 link points outside this site".
3. A **barcode** (`src/components/Barcode.astro`), full label width, 48 px high.
4. A **perforated tear line** (`.perf`): dashed faded-carbon line with two half-circle notches cut into the label edges.
5. The **stub** below it: estimated duration, the price that applies, then the actions.
6. Once comments are counted, a red **FRAGILE: COMMENTS INSIDE** sticker (`.sticker`, rotated 3°) overlaps the top-right of the counts.
7. While exporting, the **packing-tape strip** (`.tape-progress`): a tape-brown bar with a zigzag leading edge in a carton-coloured track. The print goes **below** it, never on the tape: `TAPED 412 / 1,204 · about 2 h 10 min left`.
8. When finished, the stub gets a green **PACKED** stamp (`.stamp`, rotated −4°, double border).

Only tape pieces, the sticker and the stamp are rotated. Nothing else on the site is tilted.

## 7. The first screen

The headline says the job in the visitor's words. The working tool sits next to it (desktop) or directly under the lead (mobile) and is fully visible without scrolling at **1280×800** and **390×844**.

**Words:**
- Kicker (mono tag, faded): `BULK EXPORT FOR QUIP SITES · RUNS IN YOUR BROWSER`
- h1: **Export your whole Quip site**
- Lead: "One ZIP with every folder, every comment and links between documents that still work. Ready for SharePoint, Google Drive or Notion."
- Primary button: **Count my documents – free** (the dry run. One per screen).

**1280×800:**
```
┌ header 80px: [mark] PACKOUT ················ PRICING  SECURITY  DEADLINES ┐ 2px carbon rule
│ 48px                                                                       │
│ BULK EXPORT FOR QUIP SITES · …     ┌▀▀tape──────────────────tape▀▀┐       │
│ EXPORT YOUR WHOLE                  │ CONSIGNMENT · FREE DRY RUN  PKO… │    │
│ QUIP SITE            (72px, 2 l.)  │ ───────────────────────────────  │    │
│ One ZIP with every folder, every   │ WHERE IS YOUR QUIP?              │    │
│ comment and links … (22px, 3 l.)   │ [✓ quip.com ] [  Company domain ]│    │
│                                    │ PERSONAL ACCESS TOKEN            │    │
│ ┌ hero.svg, column width ~560px ┐  │ [•••••••••••••••••••••][ SHOW ]  │    │
│ │ open carton → tape → sealed   │  │ From quip.com/dev/token. Stays … │    │
│ │ carton on a sack truck        │  │ [ Count my documents – free    ] │    │
│ └───────────────────────────────┘  │ Or try it on a sample site       │    │
└────────────────────────────────────┴──────────────────────────────────┴────┘
```
Copy column ≈ 560 px, tool column ≈ 520 px. The tool label's top edge aligns with the kicker. The hero sits under the lead in the copy column and may run slightly past the fold. The tool must not.

**390×844:** header 64 px with the mark, wordmark and one link ("Pricing"). The other links move to the footer. Then the kicker (one line, may wrap to two), h1 at 40 px in two lines ("EXPORT YOUR WHOLE / QUIP SITE"), the lead at 19 px, then the tool label at full width (16 px side padding, tape pieces still visible), with the host choice stacked, the token field and the button visible above 844 px. The hero comes after the tool.

## 8. Below the first screen (home, in this order)

1. **Three steps** (`ol.steps`, three columns from 48 rem, stacked below): spot-1 "Copy your token", spot-2 "Free dry run: count everything", spot-3 "Download one ZIP". Each step is a mono tag (`STEP 1`), an h3 and at most two lines. No cards: a 2 px rule above each column.
2. **What is in the carton**: a `.ledger` of the ZIP contents (folders/, `.html` + `.docx`, `.xlsx`, `index.html`, `manifest.csv`, `link-map.csv`, `comments.csv`, `README.txt`), each with one line. spot-comments and spot-links sit beside the rows for comments and links (right column at ≥ 60 rem, hidden under 48 rem).
3. **Price, once**: one line and a link: "Free for up to 20 documents. A whole site is 149 € once (up to 2,000 documents). See pricing."
4. **Token how-to**: the illustrated three lines from PLAN (spot-1 may be reused small).
5. Corrugated edge, then the footer (not-affiliated line, Impressum, Datenschutz).

## 9. Components and states

All are in `brand.css`. Never use the browser's default file button, select or checkbox.

- **Primary button** `.btn`: fragile red, label-stock text, Plex Sans 600 18 px, 52 px, 2 px carbon border, `3px 3px 0` carbon shadow. On hover it moves 2 px down-right as the shadow shrinks (pressed, not lifted). The label says what happens: "Count my documents – free", "Export all 1,204 documents – 149 €", "Download packout-part-1.zip".
- **Secondary** `.btn--secondary`: label stock, carbon border, no shadow ("Export 20 for free").
- **Token slot** `.slot` (this product's drop area: there is no file): a dashed window cut into the label, carton-coloured, holding `.input-row` (mono password field + SHOW toggle). Focus: solid carbon border. A valid-looking token: solid green border.
- **Tick boxes** `.ticks` / `.tick`: radio or checkbox rows, 52 px, a drawn 24 px square that fills with a green tick. Used for the host choice and the four presets (SharePoint, Google Drive, Notion, Archive only).
- **Notices** `.notice`: text between two 2 px rules with a mono tag in front: `NOTE`, `DELAYED` (Quip is throttling, waiting 2 min), `STOPPED` (red text tag) and `DONE` (green tag). Never a coloured side bar, never a rounded alert box.
- **Ledger** `.ledger`: a real `<table>`, mono tabular figures right-aligned, faded rules between rows, a tick column.

**States of the tool (all inside the one label):**
| State | What shows |
|---|---|
| Empty | The form above. Head: `CONSIGNMENT · FREE DRY RUN`. Under the button: "Nothing is downloaded yet." |
| Working (dry run) | The form collapses to one mono line (`quip.com · token ••••3f`). The counts appear and fill in, then the tape strip and `Request 38 of about 120 · Quip allows 750 an hour`. A text button "Stop". |
| Result | The waybill (§6) with the stub: duration, price, `Export all N documents – 149 €` + `Export 20 for free`. Focus moves to the head row. |
| Zero found | `spot-empty.svg` (240 px wide) inside the label, "This token sees no documents. Check that it belongs to the account that owns the folders." and "Try another token". |
| Exporting | Counts stay, the tape strip runs, the preset is shown in the head (`TO SharePoint`), "You can close this tab. It picks up where it stopped." |
| Done | PACKED stamp, download button(s) per ZIP part, the list of files, "Keep manifest.csv: it lists every document and where it went." |
| Error | A `.notice--stopped` inside the label: what happened, what to do ("Quip refused the token (401). Make a new one at quip.com/dev/token and paste it again."). The form stays filled. |

## 10. Illustration style

Hand-built SVG, flat shapes in the palette, drawn for this subject. Removal objects only: cartons, tape, labels, key tags, clipboards, string, a sack truck. No people, no screens, no laptops, no icons from packs, no text inside the art.

- **Stroke:** one width: 4 units at 1200 and 480 widths, carbon `#1d2638`, square caps, miter joins. **Corners are square** (radius 0). Circles only for grommets, holes, wheels and the tape roll.
- **Tape is the only shape without an outline**: tape-brown, zigzag torn ends, always slightly rotated.
- **Fills:** paper and labels in label stock, carton faces in corrugate, inside walls and dark sides in tape-brown, folders in carbon, comment notes in fragile red with label-stock lines, ticks and stamps in tally green. A text line is a 4-unit carbon stroke; a title is a solid carbon block; a count is a solid carbon bar.
- **Depth without gradients:** the hero is a **side view on a floor line**: objects cast a flat corrugate parallelogram to the lower right. The spots are **top-down, as if laid on the carton**: each paper object has a flat corrugate copy of its silhouette offset 10 units down-right; a carton's offset is tape-brown, so it reads as the side of the box. Overlap (tape over paper, sticker over label, documents over the carton rim) does the rest.
- **Composition:** one focal object per picture, generous empty carton around it, backgrounds transparent (the page carton shows through).

## 11. Voice

Calm, procedural, accountable: the foreman reading back the inventory to a worried team lead. Short declarative sentences, numbers first, limits named plainly. British-neutral English. No exclamation marks, no hype, no "unlock", "seamless", "effortless", no countdowns, no customer counts.

1. "Counts every folder, document and comment. Nothing is downloaded yet."
2. "Quip allows about 750 requests an hour, so 1,200 documents take about 3 hours. You can close the laptop; it picks up where it stopped."
3. "1 document lives in 2 folders. It is stored once; the other folder gets a shortcut."
4. "Your token stays in this tab and goes only to Quip. Delete it at quip.com/dev/token when you are done."
5. "Packed: 1,204 documents, 3,912 comments, 287 links rewritten. Keep manifest.csv as your receipt."

## 12. Files in the kit

| File | What it shows | Where it goes |
|---|---|---|
| `src/styles/brand.css` | Fonts, palette, scale, spacing, base styles, `.first-screen`, `.label`, `.perf`, `.btn`, `.input`, `.slot`, `.ticks`, `.sticker`, `.stamp`, `.count`, `.tape-progress`, `.notice`, `.ledger`, `.steps`, `hr.corrugated` | Imported once in `Base.astro` (replaces `tokens.css`) |
| `public/brand/logo.svg` | The taped-seam mark, 64×64 | Header (via `Logo.astro`), social cards, README |
| `public/favicon.svg` | The mark simplified for 16 px | `<link rel="icon">` |
| `public/art/hero.svg` | 1200×720 side view: open carton with a dark folder, two documents with red comment notes tied by a string → tape roll → the same carton sealed, with packing list, label, barcode and red sticker, on a sack truck | Home first screen, copy column, under the lead; `alt` = its `<title>` |
| `public/art/spot-1.svg` | Key tag with a masked token in a slot, taped down, key on a ring | Step 1 "Copy your token"; token how-to; `/security` |
| `public/art/spot-2.svg` | Clipboard inventory: four rows ticked green with count blocks, one still pending, red pencil | Step 2 "Free dry run"; `/pricing` (what the free run shows) |
| `public/art/spot-3.svg` | Sealed carton from above: taped seam, red sticker, green PACKED stamp with tick, shipping label with barcode | Step 3 "Download one ZIP"; the tool's done state (small, 160 px) |
| `public/art/spot-empty.svg` | Open empty carton from above, flaps out, dashed empty place, loose tape | Zero-documents state; 404 "undeliverable" |
| `public/art/spot-links.svg` | Two documents tied by a string through grommets, a tag on the string (link-map) | Ledger row for links; `/quip-to-sharepoint`, `/quip-to-google-drive` |
| `public/art/spot-comments.svg` | Document with three red comment notes in the margin, the DOCX copy behind | Ledger row for comments; `/quip-export-comments` |
| `public/art/pattern.svg` | The cut edge of corrugated board (40×16 tile, tape-brown) | Same drawing as `hr.corrugated`'s inline data URI; use as a top border of the footer if wanted |

Use every image with `url('art/hero.svg')` (base-path aware), explicit `width`/`height`, and meaningful `alt` text. Decorative repeats get `alt=""`.

## 13. Never

- No gradients, blur, glass, glow or soft shadows. No gradient text.
- No coloured side borders, rounded cards, pill buttons or hover lift.
- No stock hero + three cards + CTA band. No emoji, no icon packs, no stock people, no laptops.
- No Quip or Salesforce logos, colours or lookalike UI.
- No CDN fonts, no UI kit, no Tailwind palette, no browser-default file button, select or checkbox.
- No text on tape. Red means comments, the one action, focus or a stop; nothing decorative is red. No more than one primary button per screen.
