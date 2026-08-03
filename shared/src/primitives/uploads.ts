import { z } from "zod";

// Non-empty only; the real validation happens server-side when the bytes decode.
export const dataUrl = z.string().min(1);
export const imageDataUrl = dataUrl;

export const MAX_IMAGES_PER_MESSAGE = 4;

export const IMAGE_MAX_DIMENSION = 1600;

export const MAX_MESSAGE_IMAGE_BYTES = 8_000_000;

export const MAX_AVATAR_IMAGE_BYTES = 2_000_000;

export const MAX_BANNER_IMAGE_BYTES = 4_000_000;

export const IMAGE_MIME_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export const MAX_SOUNDBOARD_BYTES = 2_000_000;
export const MAX_SOUNDBOARD_DURATION_MS = 10_000;
export const MAX_SOUNDBOARD_NAME = 48;

export const SOUNDBOARD_MIME_TYPES: readonly string[] = [
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
];
