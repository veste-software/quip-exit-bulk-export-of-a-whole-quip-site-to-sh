import { describe, expect, it } from 'vitest';
import { joinBase } from '../src/lib/url';
import { barcodeBars } from '../src/lib/barcode';

describe('base-path links', () => {
  it('joins root base', () => {
    expect(joinBase('/', 'pricing/')).toBe('/pricing/');
    expect(joinBase('/', '')).toBe('/');
  });
  it('joins a preview sub-path with or without trailing slash', () => {
    expect(joinBase('/preview', '/security/')).toBe('/preview/security/');
    expect(joinBase('/preview/', 'favicon.svg')).toBe('/preview/favicon.svg');
  });
});

describe('barcode', () => {
  it('is deterministic per seed and differs between seeds', () => {
    expect(barcodeBars('PKO-1')).toEqual(barcodeBars('PKO-1'));
    expect(barcodeBars('PKO-1')).not.toEqual(barcodeBars('PKO-2'));
  });
  it('has non-overlapping bars', () => {
    const bars = barcodeBars('PKO-1');
    for (let i = 1; i < bars.length; i++) expect(bars[i].x).toBeGreaterThan(bars[i - 1].x + bars[i - 1].w - 1);
  });
});
