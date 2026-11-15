/** Deterministic decorative bar pattern for the parcel-label signature element. */
export interface Bar {
  x: number;
  w: number;
}

export function barcodeBars(seed: string, count = 42): Bar[] {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const bars: Bar[] = [];
  let x = 0;
  // guard bars at both ends, like a real code
  const push = (w: number, gap: number) => {
    bars.push({ x, w });
    x += w + gap;
  };
  push(1, 1);
  push(1, 2);
  for (let i = 0; i < count; i++) {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5; h >>>= 0;
    push(1 + (h % 3), 1 + ((h >>> 3) % 2));
  }
  push(1, 1);
  push(1, 0);
  return bars;
}
