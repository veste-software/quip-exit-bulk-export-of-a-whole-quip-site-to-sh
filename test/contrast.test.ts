import { describe, it, expect } from 'vitest';

const C = {
  paper: '#dfcba6', label: '#f7f3ea', ink: '#1d2638', faded: '#4a5163',
  accent: '#c2321b', accentInk: '#9e2a14', signal: '#285e41', corrugate: '#c9b085',
};

function lum(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('text contrast pairs from DESIGN.md', () => {
  const pairs: [string, string, string][] = [
    ['ink', 'paper', 'body text'], ['ink', 'label', 'text in the tool'], ['faded', 'paper', 'help text'], ['faded', 'label', 'help text in the tool'],
    ['accentInk', 'paper', 'red text'], ['accentInk', 'label', 'error in the tool'], ['signal', 'paper', 'green text'], ['signal', 'label', 'PACKED'],
    ['label', 'accent', 'primary button'], ['ink', 'corrugate', 'disabled button'],
  ];
  for (const [fg, bg, what] of pairs) {
    it(`${what}: ${fg} on ${bg} is at least 4.5:1`, () => {
      expect(ratio(C[fg as keyof typeof C], C[bg as keyof typeof C])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
