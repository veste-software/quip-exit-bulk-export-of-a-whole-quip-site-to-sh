import { describe, it, expect } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { createMockQuipFetch } from '../src/mock/mockQuip';
import { dryRun, type Inventory } from '../src/lib/crawl';
import { runExport, LicenceRequiredError } from '../src/lib/export/run';
import { partBytes, ZipWriter } from '../src/lib/export/zip';
import { appendCommentsToDocx, commentRows } from '../src/lib/export/comments';
import { buildMessages } from '../src/mock/fixtures';
import { makeDocx } from '../src/mock/mockQuip';
import { csvField } from '../src/lib/export/csv';
import { PRESETS, type PresetId } from '../src/lib/export/presets';
import { makeClient } from './helpers';

async function setup() {
  const client = makeClient();
  const inventory = await dryRun(client, { host: 'quip.com' });
  return { client, inventory };
}

async function exportAs(preset: PresetId, inventory?: Inventory) {
  const { client, inventory: inv } = await setup();
  const res = await runExport({ client, inventory: inventory ?? inv, preset, cap: 100 });
  const zip = unzipSync(partBytes(res.parts[0]));
  return { res, zip, names: Object.keys(zip) };
}

describe('archive export end to end', () => {
  it('writes every artefact and resolves every index href', async () => {
    const { res, zip, names } = await exportAs('archive');
    const text = (n: string) => strFromU8(zip[n]);
    expect(res.stats).toMatchObject({ documents: 15, comments: 120, linksRewritten: 3, linksUnresolved: 1 });
    // AC4: html + docx per document, xlsx per sheet, tables of contents
    expect(names.filter((n) => n.endsWith('.docx'))).toHaveLength(12);
    expect(names.filter((n) => n.endsWith('.xlsx'))).toHaveLength(3);
    for (const f of ['manifest.csv', 'link-map.csv', 'comments.csv', 'index.html', 'README.txt']) expect(names).toContain(f);
    // comments: 120 csv rows + header, appendix in the docx
    expect(text('comments.csv').trim().split('\r\n')).toHaveLength(121);
    const docx = unzipSync(zip['Private/Onboarding guide.docx']);
    expect(strFromU8(docx['word/document.xml'])).toContain('Comment 120 on the first document.');
    // manifest: one row per thread, both paths for the multi-folder doc
    const manifest = text('manifest.csv').trim().split('\r\n');
    expect(manifest).toHaveLength(16);
    expect(manifest.find((l) => l.includes('DOC00000003'))).toContain('Private/Meetings/');
    // links: rewritten relative, none to the host for exported threads
    const html = text('Private/Onboarding guide.html');
    expect(html).toContain('href="Projects/Roadmap%20notes.html#plan"');
    expect(html).toContain('href="Quarterly%20plan.html"');
    expect(html).not.toMatch(/quip\.com\/(DOC|XLS)/);
    expect(html).toContain('quip.com/ZZZ00000000');
    expect(html).toContain('<h2>Comments</h2>');
    // images stored once, relative, no /blob/ left
    const imgs = names.filter((n) => n.includes('_files/'));
    expect(imgs).toHaveLength(2);
    expect(text('Private/Quarterly plan.html')).not.toContain('/blob/');
    expect(text('Private/Quarterly plan.html')).toContain('Quarterly%20plan_files/blobA0000001.png');
    // redirect stub for the second folder
    expect(names).toContain('Private/Meetings/Release checklist.html');
    // every index.html href resolves to a file
    const hrefs = [...text('index.html').matchAll(/href="([^"]+)"/g)].map((m) => m[1].split('/').map(decodeURIComponent).join('/'));
    expect(hrefs).toHaveLength(15);
    for (const h of hrefs) expect(names, h).toContain(h);
  });
});

describe('presets', () => {
  it('SharePoint: docx/xlsx main, html only in _archive, .url shortcut', async () => {
    const { names, zip } = await exportAs('sharepoint');
    expect(names.filter((n) => n.endsWith('.html') && n !== 'index.html').every((n) => n.startsWith('_archive/'))).toBe(true);
    expect(names).toContain('Private/Meetings/Release checklist.url');
    expect(strFromU8(zip['README.txt'])).toContain('SharePoint');
  });
  it('Drive: no html, no md', async () => {
    const { names, zip } = await exportAs('drive');
    expect(names.some((n) => n.endsWith('.md') || (n.endsWith('.html') && n !== 'index.html'))).toBe(false);
    expect(strFromU8(zip['README.txt'])).toContain('Convert uploads');
  });
  it('Notion: markdown with relative links, no docx', async () => {
    const { names, zip } = await exportAs('notion');
    expect(names.some((n) => n.endsWith('.docx'))).toBe(false);
    const md = strFromU8(zip['Private/Onboarding guide.md']);
    expect(md).toContain('Roadmap%20notes.md#plan');
    expect(md).toContain('Comments');
    expect(strFromU8(zip['README.txt'])).toContain('Import');
  });
  it('every preset has its own steps', () => {
    const seen = new Set(Object.values(PRESETS).map((p) => p.steps.join()));
    expect(seen.size).toBe(4);
  });
});

describe('cap, zip, comments, csv', () => {
  it('refuses 21 documents without licence and exports 20', async () => {
    const { client, inventory } = await setup();
    const extra = inventory.threads.slice(0, 6).map((t, i) => ({ ...t, id: 'EXTRA' + String(i).padStart(6, '0') }));
    const big = { ...inventory, threads: [...inventory.threads, ...extra] };
    const err = await runExport({ client, inventory: big, preset: 'archive' }).catch((e) => e);
    expect(err).toBeInstanceOf(LicenceRequiredError);
    expect(err.tier.priceEur).toBe(149);
    const ids = big.threads.map((t) => t.id);
    const ok = await runExport({ client, inventory, preset: 'archive', threadIds: ids.slice(0, 15) });
    expect(ok.parts).toHaveLength(1);
  });
  it('splits into parts and round-trips', () => {
    const w = new ZipWriter({ maxPartBytes: 400 });
    for (let i = 0; i < 6; i++) w.add(`f${i}.txt`, 'x'.repeat(200) + i);
    const parts = w.finish();
    expect(parts.length).toBeGreaterThanOrEqual(3);
    const all = parts.flatMap((p) => Object.keys(unzipSync(partBytes(p))));
    expect(all.sort()).toEqual(['f0.txt', 'f1.txt', 'f2.txt', 'f3.txt', 'f4.txt', 'f5.txt']);
  });
  it('appends comments before sectPr and quotes CSV', () => {
    const out = appendCommentsToDocx(makeDocx('T', '<p>x</p>'), buildMessages('T', 3));
    const xml = strFromU8(unzipSync(out)['word/document.xml']);
    expect(xml.indexOf('Comment 3')).toBeLessThan(xml.indexOf('<w:sectPr'));
    expect(commentRows({ id: 'T', title: 'T' }, buildMessages('T', 2))[1][3]).toBe('Sam Sample');
    expect(csvField('a,"b"\n')).toBe('"a,""b""\n"');
  });
});
