import { existsSync, readFileSync } from "node:fs";
import { httpError } from "./http/errors.js";

const MAX_IMAGE_BYTES = 2_000_000;

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
export function decodeImageUpload(image: string): Buffer {
  const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(image);
  if (!m) httpError(400, "invalid image");

  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_IMAGE_BYTES) httpError(400, "image too large (max 2MB)");
  if (!sniffMime(buf)) httpError(400, "invalid image");
  return buf;
}

export type StoredImage = { bytes: Uint8Array<ArrayBuffer>; mime: string };

/** null when the file is missing or holds bytes we won't vouch for. */
export function readImageFile(path: string): StoredImage | null {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  const mime = sniffMime(buf);
  return mime ? { bytes: new Uint8Array(buf), mime } : null;
}
