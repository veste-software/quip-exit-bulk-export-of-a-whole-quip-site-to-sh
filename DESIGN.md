# DESIGN: Packout

## The idea

Packout is the cousin of a **parcel label printed on thermal paper, stuck on a removal carton, with a tear-off bus-ticket stub**: grey thermal paper, black print, a barcode, stencilled carton numbers and one red FRAGILE sticker. Every screen reads like paperwork from a careful removal company: the dry run is the waybill, the export is the carton being taped shut, the manifest is the carbon copy the customer keeps.

The studio's starting direction (parcel label and bus ticket) fits the spec's own idea (removal company inventory, bill of lading) almost exactly, so it is kept. From the spec we borrow kraft cardboard for the tape and the stencilled counts; we drop "carbon-copy blue" because the ink on a thermal label is black and a blue accent would drift toward the SaaS look the owner rejects.

## Typefaces (self-hosted, npm `@fontsource/...`, imported in `src/layouts/Base.astro`)

| Role | Face | Package | Weights |
|---|---|---|---|
| Display: headlines, stencilled counts, carton numbers | **Big Shoulders Stencil Display** | `@fontsource/big-shoulders-stencil-display` | 800 |
| Text: body, form labels, long pages | **IBM Plex Sans** | `@fontsource/ibm-plex-sans` | 400, 400 italic, 600 |
| Print: label fields, ledger, figures, microcopy tags | **IBM Plex Mono** (same Plex superfamily as the text face) | `@fontsource/ibm-plex-mono` | 400, 500 |

Type scale (custom properties in `src/styles/tokens.css`):

| Token | Size | Use |
|---|---|---|
| `--step--1` | 13 px | Mono labels, UPPERCASE, tracked 0.12em ("CONSIGNMENT", "FROM", "TO") |
| `--step-0` | 18 px | Body text, inputs |
| `--step-1` | 22 px | Lead sentence, h3 |
| `--step-2` | 32 px | Section heads, stencil |
| `--step-3` | 44 to 72 px | Stencilled counts in the dry-run result |
| `--step-4` | 48 to 104 px | Page headline, stencil |

Rules: headlines in stencil UPPERCASE with tight leading (0.95); every number that is counted or priced uses `.num` (Plex Mono, tabular figures); proper quotes (“ ”), en dashes for ranges, the multiplication sign for "×". Line length 55 to 75 characters (`--measure: 66ch`).

## Palette

| Name | Hex | Use |
|---|---|---|
| Thermal paper | `#e9e7e1` | Page surface |
| Label stock | `#f8f7f3` | Raised surfaces: the tool, the ticket, results, inputs |
| Thermal ink | `#1e1f22` | All text, rules, barcode, the logo outline |
| Faded print | `#55565b` | Secondary text, perforation lines (5.6:1 on paper) |
| Kraft | `#b5844f` | Carton and packing tape: the progress strip, the logo carton, selection. Never text |
| Fragile red | `#c2321b` | The one accent: the primary button fill, focus ring, the FRAGILE sticker, errors. `#a82b16` when it must be text on paper |

No other colours. No pure white, no pure black, no blue, no violet. No gradients anywhere (the barcode is SVG rectangles, the perforation is a dashed border, the notches are circles).

## Grid and spacing

- 8 px base; only `--s1` (8) `--s2` (16) `--s3` (24) `--s4` (32) `--s6` (48) `--s8` (64).
- Content max width 72 rem, side padding 24 px (16 px under 480 px).
- Home: two uneven columns at ≥ 900 px (copy 1.1fr, tool 1fr); the tool column is the label. One column below, tool directly under the lead sentence.
- Long pages: a narrow left rail (mono labels like "STEP 1 / SHAREPOINT") and a 66ch text column; the rhythm changes between sections with a full-width ink rule or a perforation, never with boxes around everything.
- Grouping uses rules (`--rule`, `--rule-faded`), the perforation (`--perforation`) and type, not cards.

## Signature element: the waybill

The dry-run result and the export progress are printed on **one parcel label** (`label stock` with a 1 px ink border and a hard 3 px offset ink shadow, as if stuck on slightly proud):

1. Header row in mono: `FROM quip.com / <user>` · `TO SharePoint` · consignment number `PKO-xxx-xxx` (derived from host and user id).
2. **Stencilled counts** in Big Shoulders Stencil at `--step-3`: FOLDERS, DOCUMENTS, SPREADSHEETS, COMMENTS, LINKS, each with a mono caption. Multi-folder and unresolved links appear as small mono lines underneath ("1 document lives in 2 folders", "1 link points outside this site").
3. A **barcode** (`src/components/Barcode.astro`, deterministic inline SVG rectangles from the consignment number).
4. A **perforated tear line**: a dashed `--perforation` border with two semicircular notches cut into the label edges (absolutely positioned circles filled with `--paper`, 1 px ink border, half outside the label).
5. Below the tear line, the **stub**: estimated duration, the price that applies, and the two actions ("Export all 1,204 documents – 149 €" and "Export 20 for free").
6. While exporting, a **packing-tape strip** runs across the label: a kraft bar (`--kraft`, flat) whose width is the progress, with mono print on top: `TAPED 412 / 1,204 · 2 h 10 min left`.
7. A red rotated **FRAGILE: COMMENTS INSIDE** sticker (fragile red, label-stock text, 3° rotation, square corners) sits on the label once comments are counted. It is the only rotated element on the site.

The same label shape, smaller, is reused for the 404 ("undeliverable") and for the empty state of the tool.

## Components

- **Primary button**: fragile-red fill, label-stock text, Plex Sans 600 18 px, 48 px high minimum, square corners (`--radius: 2px`), hard 3 px ink offset shadow; on hover the shadow goes to 1 px and the button shifts 2 px down-right (pressed, not lifted); on focus a 3 px fragile outline offset 3 px. One per screen.
- **Secondary button**: label-stock fill, 1 px ink border, same size, no shadow.
- **Inputs**: label stock, 1 px ink border, 48 px high, mono 18 px for the token (it is a code), a mono UPPERCASE label above ("PERSONAL ACCESS TOKEN"), help text in faded print below. Password-type field with a "Show" text toggle.
- **Host choice**: two printed tick boxes ("☐ quip.com" / "☐ Company Quip domain"), built as radio inputs with a drawn square; checked shows an ink ✕ drawn in CSS, as if ticked by pen.
- **File-free tool**: there is no file upload; the "drop area" is the token label. Never the browser's default select: the preset choice is four printed tick boxes too (SharePoint, Google Drive, Notion, Archive only).
- **Results**: the waybill above; the done state is the stub stamped **PACKED** (stencil, ink outline, rotated −4°) with the download button(s) and a short list of what is in the ZIP.
- **Notices**: a full-width strip of faded-print text between two ink rules with a mono label in front ("NOTE", "DELAYED", "STOPPED"). Errors use the label "STOPPED" in fragile red and say what is wrong and what to do. Never a coloured bar on one side, never a rounded alert box.
- **Ledger** (manifest preview and price comparison): a real `<table>` with mono tabular figures, ink rules between rows, a tick column.

## Voice

Calm, procedural, accountable: the foreman reading back the inventory. Short declarative sentences, numbers first. Say what happens and what the user gets ("Counts every folder and document. Nothing is downloaded yet."), name limits plainly ("Quip allows about 750 requests an hour, so 1,200 documents take about 3 hours. You can close the laptop; it picks up where it stopped."). No exclamation marks, no hype, no "unlock", "seamless", "effortless". Quip and Salesforce named only descriptively. British-neutral English, dates as 1 March 2027.

## What we will not do

- No coloured side borders, no rounded cards, no pill buttons, no hover lift, no soft or glowing shadows (only the hard 3 px offset).
- No gradients of any kind, no blur, no gradient text.
- No stock hero + three cards + numbered steps + CTA band. The home page is: headline, one sentence, the label tool.
- No emoji, no icon packs. Any icon is inline SVG in a 2 px ink stroke, square caps.
- No Quip or Salesforce logos, colours or lookalike UI. No Salesforce blue.
- No countdown timers, fake urgency, customer counts or testimonials.
- No CDN fonts, no UI kit, no Tailwind default palette.
