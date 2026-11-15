/** Sliding-window rate limiter and retry policy for Quip's API limits (about 45/min, 700/hour per token). */
export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export interface LimiterOptions {
  perMinute?: number;
  perHour?: number;
  clock?: Clock;
}

export class RateLimiter {
  readonly clock: Clock;
  private stamps: number[] = [];
  private perMinute: number;
  private perHour: number;
  /** Total requests allowed through so far. */
  count = 0;

  constructor(opts: LimiterOptions = {}) {
    this.clock = opts.clock ?? realClock;
    this.perMinute = opts.perMinute ?? 45;
    this.perHour = opts.perHour ?? 700;
  }

  async acquire(): Promise<void> {
    for (;;) {
      const now = this.clock.now();
      while (this.stamps.length && now - this.stamps[0] >= 3_600_000) this.stamps.shift();
      let wait = 0;
      if (this.stamps.length >= this.perHour) wait = Math.max(wait, this.stamps[0] + 3_600_000 - now);
      if (this.stamps.length >= this.perMinute) {
        const s = this.stamps[this.stamps.length - this.perMinute];
        wait = Math.max(wait, s + 60_000 - now);
      }
      if (wait <= 0) {
        this.stamps.push(now);
        this.count++;
        return;
      }
      await this.clock.sleep(wait);
    }
  }
}

export class QuipHttpError extends Error {
  constructor(public status: number, message?: string) {
    super(message ?? `Quip answered with HTTP ${status}`);
    this.name = 'QuipHttpError';
  }
}

export interface RetryOptions {
  clock?: Clock;
  maxThrottleRetries?: number;
  maxServerRetries?: number;
  onThrottle?: (waitMs: number, status: number) => void;
}

const BASE_MS = 2000;
const MAX_MS = 300_000;

/** 503/429 = Quip is throttling: back off (honouring Retry-After). Other 5xx: 3 retries. 4xx: fail. */
export async function withRetry(call: () => Promise<Response>, opts: RetryOptions = {}): Promise<Response> {
  const clock = opts.clock ?? realClock;
  const maxThrottle = opts.maxThrottleRetries ?? 12;
  const maxServer = opts.maxServerRetries ?? 3;
  let throttled = 0;
  let server = 0;
  for (;;) {
    const res = await call();
    if (res.ok) return res;
    if (res.status === 503 || res.status === 429) {
      if (throttled >= maxThrottle) throw new QuipHttpError(res.status, 'Quip kept throttling; gave up after several waits.');
      const ra = Number(res.headers.get('Retry-After'));
      const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(BASE_MS * 2 ** throttled, MAX_MS);
      throttled++;
      opts.onThrottle?.(wait, res.status);
      await clock.sleep(wait);
      continue;
    }
    if (res.status >= 500) {
      if (server >= maxServer) throw new QuipHttpError(res.status);
      await clock.sleep(1000 * 2 ** server);
      server++;
      continue;
    }
    throw new QuipHttpError(res.status);
  }
}
