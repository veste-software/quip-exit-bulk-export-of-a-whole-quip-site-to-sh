import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { QuipMessage } from '../quip/types';
import { escapeHtml, toCsv } from './csv';

export const iso = (usec: number): string => new Date(Math.floor(usec / 1000)).toISOString();

/** Oldest first. */
export const chronological = (m: QuipMessage[]): QuipMessage[] => [...m].sort((a, b) => a.created_usec - b.created_usec);

export function commentsHtml(messages: QuipMessage[]): string {
  if (!messages.length) return '';
  const items = chronological(messages)
    .map(
      (m) =>
        `<li><p><strong>${escapeHtml(m.author_name)}</strong> <time datetime="${iso(m.created_usec)}">${iso(m.created_usec)}</time></p><p>${escapeHtml(m.text)}</p></li>`,
    )
    .join('');
  return `<section class="comments"><h2>Comments</h2><ol>${items}</ol></section>`;
}

export const COMMENT_HEADER = ['thread_id', 'thread_title', 'comment_id', 'author', 'created_at', 'text'];

export function commentRows(thread: { id: string; title: string }, messages: QuipMessage[]): string[][] {
  return chronological(messages).map((m) => [thread.id, thread.title, m.id, m.author_name, iso(m.created_usec), m.text]);
}

export const commentsCsv = (rows: string[][]): string => toCsv(COMMENT_HEADER, rows);

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const para = (text: string, bold = false) =>
  `<w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:p>`;

/** Insert a "Comments" heading and one paragraph per comment before the final section properties. */
export function appendCommentsToDocx(docx: Uint8Array, messages: QuipMessage[]): Uint8Array {
  if (!messages.length) return docx;
  const files = unzipSync(docx);
  const doc = files['word/document.xml'];
  if (!doc) return docx;
  let xml = strFromU8(doc);
  const block =
    para('Comments', true) +
    chronological(messages)
      .map((m) => para(`${m.author_name}, ${iso(m.created_usec)}: ${m.text}`))
      .join('');
  const at = xml.lastIndexOf('<w:sectPr');
  const end = at >= 0 ? at : xml.lastIndexOf('</w:body>');
  if (end < 0) return docx;
  xml = xml.slice(0, end) + block + xml.slice(end);
  files['word/document.xml'] = strToU8(xml);
  return zipSync(files);
}
