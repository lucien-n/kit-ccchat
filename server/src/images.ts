import { IMAGE_MIME_TYPES } from "@ccchat/shared";
import { blobStore, decodeDataUrl, readBlobFile, type StoredBlob } from "./blob.js";

export function sniffMime(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF") return "image/webp";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  return null;
}

export type StoredImage = StoredBlob;

export function decodeImageUpload(image: string, maxBytes: number): Buffer {
  return decodeDataUrl(image, {
    allowed: IMAGE_MIME_TYPES,
    maxBytes,
    sniff: sniffMime,
    label: "image",
  });
}

export const readImageFile = (path: string): StoredImage | null =>
  readBlobFile(path, sniffMime);

export const imageStore = (dir: string) => blobStore(dir, sniffMime);
