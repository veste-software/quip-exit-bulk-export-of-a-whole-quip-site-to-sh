import { RateLimiter, withRetry } from '../ratelimit';
import type { MessagePage, QuipFolderRecord, QuipMessage, QuipThreadRecord, QuipUser } from './types';

export interface QuipClientOptions {
  fetch: typeof fetch;
  /** `<relay>/api` (real) or any base the mock ignores. */
  apiBase: string;
  token: string;
  limiter: RateLimiter;
  /** The Quip host, sent as X-Quip-Host to the relay. */
  host?: string;
  onThrottle?: (waitMs: number, status: number) => void;
}

const chunk = <T,>(a: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
};

export class QuipClient {
  constructor(private o: QuipClientOptions) {}

  get requestCount(): number {
    return this.o.limiter.count;
  }

  private async request(path: string): Promise<Response> {
    // The token travels only in this header: never in a URL.
    const headers: Record<string, string> = { Authorization: `Bearer ${this.o.token}` };
    if (this.o.host) headers['X-Quip-Host'] = this.o.host;
    return withRetry(
      async () => {
        await this.o.limiter.acquire();
        return this.o.fetch(`${this.o.apiBase}${path}`, { headers });
      },
      { clock: this.o.limiter.clock, onThrottle: this.o.onThrottle },
    );
  }

  private async json<T>(path: string): Promise<T> {
    return (await this.request(path)).json() as Promise<T>;
  }

  private async bytes(path: string): Promise<Uint8Array> {
    return new Uint8Array(await (await this.request(path)).arrayBuffer());
  }

  currentUser(): Promise<QuipUser> {
    return this.json('/1/users/current');
  }

  /** Batched, 10 ids per call. */
  async folders(ids: string[]): Promise<Record<string, QuipFolderRecord>> {
    const out: Record<string, QuipFolderRecord> = {};
    for (const part of chunk(ids, 10)) {
      Object.assign(out, await this.json<Record<string, QuipFolderRecord>>(`/1/folders/?ids=${part.join(',')}`));
    }
    return out;
  }

  async threads(ids: string[]): Promise<Record<string, QuipThreadRecord>> {
    const out: Record<string, QuipThreadRecord> = {};
    for (const part of chunk(ids, 10)) {
      Object.assign(out, await this.json<Record<string, QuipThreadRecord>>(`/1/threads/?ids=${part.join(',')}`));
    }
    return out;
  }

  /** All comments of a thread, following the cursor. Newest first, as Quip returns them. */
  async messagesAll(threadId: string): Promise<QuipMessage[]> {
    const all: QuipMessage[] = [];
    let cursor: string | undefined;
    do {
      const q = `count=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const page = await this.json<MessagePage>(`/1/threads/${threadId}/messages?${q}`);
      all.push(...page.messages);
      cursor = page.next_cursor;
    } while (cursor);
    return all;
  }

  exportDocx(id: string): Promise<Uint8Array> {
    return this.bytes(`/1/threads/${id}/export/docx`);
  }

  exportXlsx(id: string): Promise<Uint8Array> {
    return this.bytes(`/1/threads/${id}/export/xlsx`);
  }

  blob(threadId: string, blobId: string): Promise<Uint8Array> {
    return this.bytes(`/1/blob/${threadId}/${blobId}`);
  }
}
