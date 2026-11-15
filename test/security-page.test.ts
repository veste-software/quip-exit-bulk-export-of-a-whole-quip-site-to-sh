import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';

it('security page does not claim the Quip token can be kept in session storage', () => {
  const src = readFileSync('src/pages/security.astro', 'utf8');
  expect(src).not.toMatch(/session storage/i);
});
