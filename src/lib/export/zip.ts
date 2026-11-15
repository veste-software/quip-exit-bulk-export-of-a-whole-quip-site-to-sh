import { Zip, ZipDeflate, ZipPassThrough } from 'fflate';

export interface ZipPart {
  name: string;
  chunks: Uint8Array[];
  size: number;
}

const STORED = /\.(docx|xlsx|png|jpe?g|gif|webp|zip)$/i;

/** Writes files into one or more ZIP parts; a new part starts before a part would pass `maxPartBytes`. */
export class ZipWriter {
  private parts: ZipPart[] = [];
  private zip: Zip | null = null;
  private current: ZipPart | null = null;
  private currentFiles = 0;
  readonly files: string[] = [];

  constructor(private opts: { maxPartBytes?: number; namePrefix?: string } = {}) {}

  private open() {
    const part: ZipPart = { name: '', chunks: [], size: 0 };
    this.parts.push(part);
    part.name = `${this.opts.namePrefix ?? 'packout'}-part-${this.parts.length}.zip`;
    this.current = part;
    this.currentFiles = 0;
    this.zip = new Zip((err, chunk) => {
      if (err) throw err;
      part.chunks.push(chunk);
      part.size += chunk.length;
    });
  }

  private close() {
    this.zip?.end();
    this.zip = null;
  }

  add(path: string, data: Uint8Array | string): void {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const max = this.opts.maxPartBytes ?? 1_000_000_000;
    if (this.zip && this.currentFiles > 0 && this.current!.size + bytes.length + 300 > max) this.close();
    if (!this.zip) this.open();
    const entry = STORED.test(path) ? new ZipPassThrough(path) : new ZipDeflate(path, { level: 6 });
    entry.mtime = Date.UTC(2026, 0, 1);
    this.zip!.add(entry);
    entry.push(bytes, true);
    this.currentFiles++;
    this.files.push(path);
  }

  finish(): ZipPart[] {
    this.close();
    return this.parts;
  }
}

export function partBytes(part: ZipPart): Uint8Array {
  const out = new Uint8Array(part.size);
  let at = 0;
  for (const c of part.chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
