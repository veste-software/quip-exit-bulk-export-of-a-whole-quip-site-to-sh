/** A fetch-compatible fake of the Quip Automation API, serving the SYNTHETIC fixtures. */
import { zipSync, strToU8 } from 'fflate';
import { buildSite, MOCK_TOKEN, type FixtureSite } from './fixtures';

export interface MockOptions {
  site?: FixtureSite;
  token?: string;
  /** Answer the first N requests with 503 (throttling). */
  fail503Times?: number;
  onRequest?: (info: { method: string; path: string }) => void;
}

const PNG = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 254, 2, 254, 167, 53, 129, 132, 0, 0, 0,
  0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export function makeDocx(title: string, html: string): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    'word/document.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${esc(title)}</w:t></w:r></w:p><w:p><w:r><w:t>${esc(textOf(html))}</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`,
    ),
  });
}

export function makeXlsx(title: string): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(title).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>A</t></is></c></row></sheetData></worksheet>',
    ),
  });
}

export function createMockQuipFetch(opts: MockOptions = {}) {
  const site = opts.site ?? buildSite();
  const token = opts.token ?? MOCK_TOKEN;
  let failures = opts.fail503Times ?? 0;

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const bytes = (data: Uint8Array, type: string) =>
    new Response(data as BlobPart, { status: 200, headers: { 'Content-Type': type } });

  return async function mockFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const headers = new Headers(init?.headers);
    const path = u.pathname.replace(/^.*?(?=\/1\/)/, '');
    opts.onRequest?.({ method: init?.method ?? 'GET', path: path + u.search });

    if (headers.get('Authorization') !== `Bearer ${token}`) return json({ error: 'unauthorized' }, 401);
    if (failures > 0) {
      failures--;
      return new Response('slow down', { status: 503 });
    }

    if (path === '/1/users/current') return json(site.user);

    if (path === '/1/folders/') {
      const out: Record<string, unknown> = {};
      for (const id of (u.searchParams.get('ids') ?? '').split(',').filter(Boolean)) {
        const f = site.folders[id];
        if (!f) continue;
        out[id] = {
          folder: { id: f.id, title: f.title },
          children: [...f.folders.map((folder_id) => ({ folder_id })), ...f.threads.map((thread_id) => ({ thread_id }))],
        };
      }
      return json(out);
    }

    const record = (id: string) => {
      const t = site.threads[id];
      return {
        thread: { id: t.id, title: t.title, type: t.type, link: `https://${site.host}/${t.id}`, updated_usec: t.updated_usec, author_id: site.user.id, owner_name: t.owner },
        html: t.html,
      };
    };

    if (path === '/1/threads/') {
      const out: Record<string, unknown> = {};
      for (const id of (u.searchParams.get('ids') ?? '').split(',').filter(Boolean)) if (site.threads[id]) out[id] = record(id);
      return json(out);
    }

    let m = path.match(/^\/1\/threads\/([A-Za-z0-9]+)\/messages$/);
    if (m) {
      const all = site.messages[m[1]] ?? [];
      const count = Number(u.searchParams.get('count') ?? 100);
      const start = Number(u.searchParams.get('cursor') ?? 0);
      const messages = all.slice(start, start + count);
      return json({ messages, next_cursor: start + count < all.length ? String(start + count) : undefined });
    }

    m = path.match(/^\/1\/threads\/([A-Za-z0-9]+)\/export\/(docx|xlsx)$/);
    if (m) {
      const t = site.threads[m[1]];
      if (!t) return json({ error: 'not found' }, 404);
      return m[2] === 'docx'
        ? bytes(makeDocx(t.title, t.html), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        : bytes(makeXlsx(t.title), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    m = path.match(/^\/1\/threads\/([A-Za-z0-9]+)$/);
    if (m) return site.threads[m[1]] ? json(record(m[1])) : json({ error: 'not found' }, 404);

    m = path.match(/^\/1\/blob\/([A-Za-z0-9]+)\/([A-Za-z0-9]+)$/);
    if (m) return bytes(PNG, 'image/png');

    return json({ error: 'not found' }, 404);
  };
}
