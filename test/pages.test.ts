import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { timelineFor, addDays, isIsoDate, longDate } from '../src/lib/timeline';

const pages = ['quip-to-sharepoint', 'quip-to-google-drive', 'quip-to-notion', 'quip-export-comments', 'quip-retirement-timeline', 'pricing', 'security'];

function bodyText(src: string): string {
  return src
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ');
}

describe('content pages', () => {
  for (const p of pages) {
    it(`${p} has at least 400 words and a way to the tool`, () => {
      const src = readFileSync(`src/pages/${p}.astro`, 'utf8');
      const words = bodyText(src).split(/\s+/).filter((w) => /\w/.test(w));
      expect(words.length).toBeGreaterThanOrEqual(400);
      expect(src.includes('#tool') || src.includes('<ExportTool')).toBe(true);
    });
  }
  it('pricing body takes its prices from pricing.ts', () => {
    const src = readFileSync('src/pages/pricing.astro', 'utf8');
    expect(src).toContain("from '../lib/pricing'");
    expect(bodyText(src)).not.toMatch(/\b(149|390)\b/);
  });
});

describe('timeline', () => {
  it('adds 90, 180 and 210 days to a fixed term end', () => {
    expect(timelineFor('2027-03-01')).toEqual({
      termEnd: '2027-03-01',
      readOnlyUntil: '2027-05-30',
      loginsBlockedUntil: '2027-08-28',
      deletionDoneBy: '2027-09-27',
    });
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(timelineFor('2027-02-30')).toBeNull();
    expect(isIsoDate('hello')).toBe(false);
    expect(longDate('2027-03-01')).toBe('1 March 2027');
  });
  it('has no countdown on the page', () => {
    const src = readFileSync('src/pages/quip-retirement-timeline.astro', 'utf8');
    expect(src).not.toMatch(/setInterval|countdown/i);
  });
});
