/**
 * SYNTHETIC DATA. Everything here is invented for tests and for the "sample site" demo.
 * It is not a real Quip site, and none of the names are real people.
 */
import type { QuipMessage, ThreadType } from '../lib/quip/types';

export const MOCK_HOST = 'quip.com';
export const MOCK_TOKEN = 'mock-token-0000';

export interface FixtureThread {
  id: string;
  title: string;
  type: ThreadType;
  html: string;
  updated_usec: number;
  owner: string;
}

export interface FixtureFolder {
  id: string;
  title: string;
  /** child folders first, then threads */
  folders: string[];
  threads: string[];
}

export interface FixtureSite {
  user: { id: string; name: string; private_folder_id: string; shared_folder_ids: string[] };
  folders: Record<string, FixtureFolder>;
  threads: Record<string, FixtureThread>;
  messages: Record<string, QuipMessage[]>;
  host: string;
}

const pad = (n: number) => String(n).padStart(8, '0');
const docId = (n: number) => `DOC${pad(n)}`;
const sheetId = (n: number) => `XLS${pad(n)}`;
export const UNKNOWN_THREAD_ID = 'ZZZ00000000';
const T0 = Date.UTC(2025, 0, 6, 9, 0, 0) * 1000;

const titles = [
  'Onboarding guide', 'Quarterly plan', 'Release checklist', 'Team handbook', 'Roadmap notes', 'Vendor review',
  'Incident log', 'Design brief', 'Old budget', 'Retro 2023', 'Meeting notes: kickoff', 'Meeting notes: review',
];

function docHtml(n: number): string {
  const title = titles[n - 1];
  const link = (id: string, label: string, extra = '') =>
    `<a href="${extra}">${label}</a>`.replace('href="', `href="${id}`);
  let body = `<h1>${title}</h1><p>Synthetic paragraph for document ${n}.</p>`;
  if (n === 1) {
    body +=
      `<p>See ${link('https://' + MOCK_HOST + '/' + docId(2), 'the onboarding page', '/Onboarding-guide')}, ` +
      `${link('/' + docId(5), 'the roadmap', '/Roadmap-notes#plan')}, ` +
      `${link('https://' + MOCK_HOST + '/' + sheetId(1), 'the budget sheet', '/Budget#total')} ` +
      `and ${link('https://' + MOCK_HOST + '/' + UNKNOWN_THREAD_ID, 'a page outside this site', '/Elsewhere')}.</p>`;
  }
  if (n === 2) {
    body +=
      `<p><img src="/blob/${docId(2)}/blobA0000001" alt="diagram one"></p>` +
      `<p><img src="/blob/${docId(2)}/blobB0000002" alt="diagram two"></p>`;
  }
  return body;
}

export function buildMessages(threadId: string, count: number): QuipMessage[] {
  const out: QuipMessage[] = [];
  for (let i = count; i >= 1; i--) {
    out.push({
      id: `${threadId}M${pad(i)}`,
      author_id: i % 2 ? 'USER0000001' : 'USER0000002',
      author_name: i % 2 ? 'Dana Example' : 'Sam Sample',
      created_usec: T0 + i * 60_000_000,
      text: `Comment ${i} on the first document.`,
    });
  }
  return out; // newest first, like Quip
}

export function buildSite(): FixtureSite {
  const threads: Record<string, FixtureThread> = {};
  const add = (id: string, title: string, type: ThreadType, html: string, n: number) => {
    threads[id] = { id, title, type, html, updated_usec: T0 + n * 3_600_000_000, owner: 'Dana Example' };
  };
  for (let n = 1; n <= 12; n++) add(docId(n), titles[n - 1], 'document', docHtml(n), n);
  const sheetTitles = ['Budget', 'Headcount', 'Old forecast'];
  sheetTitles.forEach((t, i) =>
    add(sheetId(i + 1), t, 'spreadsheet', `<h1>${t}</h1><table><tr><td>A</td><td>${i + 1}</td></tr></table>`, 20 + i),
  );

  const folders: Record<string, FixtureFolder> = {
    FLDPRIVATE1: {
      id: 'FLDPRIVATE1', title: 'Private', folders: ['FLDPROJECT1', 'FLDMEETING1'],
      threads: [docId(1), docId(2), docId(3), docId(4), sheetId(1)],
    },
    FLDPROJECT1: {
      id: 'FLDPROJECT1', title: 'Projects', folders: ['FLDARCHIVE1'],
      threads: [docId(5), docId(6), docId(7), docId(8), sheetId(2)],
    },
    FLDARCHIVE1: { id: 'FLDARCHIVE1', title: 'Archive', folders: [], threads: [docId(9), docId(10), sheetId(3)] },
    FLDMEETING1: { id: 'FLDMEETING1', title: 'Meetings', folders: [], threads: [docId(11), docId(12), docId(3)] },
  };

  return {
    host: MOCK_HOST,
    user: { id: 'USER0000001', name: 'Dana Example', private_folder_id: 'FLDPRIVATE1', shared_folder_ids: [] },
    folders,
    threads,
    messages: { [docId(1)]: buildMessages(docId(1), 120) },
  };
}

export const FIXTURE_IDS = { doc: docId, sheet: sheetId, unknown: UNKNOWN_THREAD_ID };
