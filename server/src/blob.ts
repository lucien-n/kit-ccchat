import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { httpError } from "./http/errors.js";

export type SniffMime = (buf: Buffer) => string | null;

export type StoredBlob = { bytes: Uint8Array<ArrayBuffer>; mime: string };

/** Absolute path for `id` inside `dir`, or null if the resolved path would escape
 *  `dir`. The single traversal guard shared by every on-disk store. */
export function safePathOf(dir: string, id: string): string | null {
  const path = resolve(dir, id);
  return dirname(path) === dir ? path : null;
}

/** The data: mime is only the uploader's claim; the sniffed bytes are the gate. */
export function decodeDataUrl(
  data: string,
  opts: { allowed: readonly string[]; maxBytes: number; sniff: SniffMime; label: string },
): Buffer {
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(data);
  if (!m || !opts.allowed.includes(m[1])) httpError(400, `invalid ${opts.label}`);

  const buf = Buffer.from(m[2], "base64");
  if (buf.length > opts.maxBytes)
    httpError(
      400,
      `${opts.label} too large (max ${Math.round(opts.maxBytes / 1_000_000)}MB)`,
    );
  if (!opts.sniff(buf)) httpError(400, `invalid ${opts.label}`);
  return buf;
}

export function readBlobFile(path: string, sniff: SniffMime): StoredBlob | null {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  const mime = sniff(buf);
  return mime ? { bytes: new Uint8Array(buf), mime } : null;
}

export function blobStore(dir: string, sniff: SniffMime) {
  mkdirSync(dir, { recursive: true });

  const pathOf = (id: string): string | null => safePathOf(dir, id);

  return {
    read(id: string): StoredBlob {
      const path = pathOf(id);
      const blob = path ? readBlobFile(path, sniff) : null;
      if (!blob) httpError(404, "not found");
      return blob;
    },
    write(id: string, bytes: Buffer) {
      writeFileSync(join(dir, id), bytes);
    },
    remove(id: string) {
      const path = pathOf(id);
      if (path) rmSync(path, { force: true });
    },
  };
}
