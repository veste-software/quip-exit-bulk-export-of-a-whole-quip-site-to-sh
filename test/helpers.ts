import { createMockQuipFetch } from '../src/mock/mockQuip';
import { MOCK_TOKEN } from '../src/mock/fixtures';
import { RateLimiter, type Clock } from '../src/lib/ratelimit';
import { QuipClient } from '../src/lib/quip/client';

export function fakeClock(): Clock & { t: number } {
  const c = { t: 1_000_000, now: () => c.t, sleep: async (ms: number) => { c.t += ms; } };
  return c;
}

export function makeClient(fetchFn = createMockQuipFetch(), token = MOCK_TOKEN) {
  const limiter = new RateLimiter({ clock: fakeClock() });
  return new QuipClient({ fetch: fetchFn as typeof fetch, apiBase: 'https://relay.test/api', token, limiter, host: 'quip.com' });
}
