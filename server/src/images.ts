import { IMAGE_MIME_TYPES } from "@ccchat/shared";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { httpError } from "./http/errors.js";

/** Content type from magic bytes so we serve images with the right header.
 *  null = these bytes are not an image we recognise. */
export function sniffMime(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF") return "image/webp";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  return null;
}

/** Decode a `data:image/...;base64,` upload. The data: prefix is only a claim
 *  the uploader makes, so the bytes themselves decide whether this is an image. */
export function decodeImageUpload(image: string, maxBytes: number): Buffer {
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(image);
  if (!m || !IMAGE_MIME_TYPES.includes(m[1])) httpError(400, "invalid image");

  const buf = Buffer.from(m[2], "base64");
  if (buf.length > maxBytes)
    httpError(400, `image too large (max ${Math.round(maxBytes / 1_000_000)}MB)`);
  if (!sniffMime(buf)) httpError(400, "invalid image");
  return buf;
}

export type StoredImage = { bytes: Uint8Array<ArrayBuffer>; mime: string };

export function readImageFile(path: string): StoredImage | null {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  const mime = sniffMime(buf);
  return mime ? { bytes: new Uint8Array(buf), mime } : null;
}

export function imageStore(dir: string) {
  mkdirSync(dir, { recursive: true });

  const pathOf = (id: string): string | null => {
    const path = resolve(dir, id);
    return dirname(path) === dir ? path : null;
  };

  return {
    read(id: string): StoredImage {
      const path = pathOf(id);
      const image = path ? readImageFile(path) : null;
      if (!image) httpError(404, "not found");
      return image;
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
