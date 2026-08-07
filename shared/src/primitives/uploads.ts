import { z } from "zod";

// Non-empty only; the real validation happens server-side when the bytes decode.
export const dataUrl = z.string().min(1);
export const imageDataUrl = dataUrl;

export const IMAGE_MAX_DIMENSION = 1600;

export const MAX_AVATAR_IMAGE_BYTES = 2_000_000;

export const MAX_BANNER_IMAGE_BYTES = 4_000_000;

export const IMAGE_MIME_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

// ── Arbitrary file attachments ───────────────────────────────────────────────
// Images are a subset of attachments: an image file keeps its resized bytes and
// dimensions and renders inline, everything else is a download.

export const MAX_ATTACHMENTS_PER_MESSAGE = 12;

/** Hard ceiling on a single attachment. Uploads are streamed to disk, so this
 *  guards the disk rather than memory; the client rejects earlier for feedback. */
export const MAX_ATTACHMENT_BYTES = 2_000_000_000; // 2 GB

// The TTL policy (size threshold + lifetime) is server-only and operator-tunable;
// it lives in the server's env.ts, not here - the client only ever displays the
// server-computed expiresAt.

export const MAX_ATTACHMENT_FILENAME = 255;

export const MAX_SOUNDBOARD_BYTES = 2_000_000;
export const MAX_SOUNDBOARD_DURATION_MS = 10_000;
export const MAX_SOUNDBOARD_NAME = 48;

export const SOUNDBOARD_MIME_TYPES: readonly string[] = [
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
];

export function isAudioType(mime: string): boolean {
  return mime.startsWith("audio/");
}

export function isVideoType(mime: string) {
  return mime.startsWith("video/");
}

export const attachmentKind = z.enum(["image", "audio", "video", "file"]);
export type AttachmentKind = z.infer<typeof attachmentKind>;

export function kindOfAttachment(a: { image: boolean; mime: string }): AttachmentKind {
  if (a.image) return "image";
  if (isAudioType(a.mime)) return "audio";
  if (isVideoType(a.mime)) return "video";
  return "file";
}
