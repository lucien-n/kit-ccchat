import {
  IMAGE_MAX_DIMENSION,
  IMAGE_MIME_TYPES,
  MAX_AVATAR_IMAGE_BYTES,
  MAX_BANNER_IMAGE_BYTES,
} from "@motus/shared";

/** Formats we upload untouched. Redrawing one onto a canvas keeps a single
 *  frame, so a GIF would arrive as a still and a WebP would lose its alpha. */
const PASSTHROUGH = new Set(["image/gif", "image/webp"]);

/** The single client-side definition of "this is an image", kept in step with the
 *  server's `sniffMime` gate. Decides whether an upload runs the image prepare path
 *  and whether the composer renders an image chip rather than a file chip. */
export function isImageType(type: string): boolean {
  return IMAGE_MIME_TYPES.includes(type);
}

/** Whether prepareImageUpload would actually shrink this type rather than upload
 *  it as-is. Animated/alpha formats always pass through, so a "keep original"
 *  toggle is meaningless for them - the composer only offers it for the rest. */
export function isCompressibleImageType(type: string): boolean {
  return isImageType(type) && !PASSTHROUGH.has(type);
}

function tooLargeError(file: File, maxBytes: number): Error {
  const kind = file.type === "image/gif" ? "gif" : "image";
  return new Error(`that ${kind} is too large (max ${maxBytes / 1_000_000}MB)`);
}

/** Animated formats (see PASSTHROUGH) upload untouched, so all three entry
 *  points share the same size-gate-then-encode step. */
async function passthroughDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) throw tooLargeError(file, maxBytes);
  return fileToDataUrl(file);
}

function measure(file: File): Promise<{ el: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    const url = URL.createObjectURL(file);
    el.onload = () => resolve({ el, url });
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not read image"));
    };
    el.src = url;
  });
}

/** Read any File into a base64 `data:` URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

export interface PreparedImageUpload {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("could not encode image"))),
      type,
      0.85,
    );
  });
}

/** Turn an image File into the resized bytes we upload as an attachment, plus its
 *  final dimensions. Animated formats (see PASSTHROUGH) upload untouched so they
 *  keep playing, and `keepOriginal` opts any image out of the compress pass;
 *  everything else is redrawn onto a capped canvas. Returns a Blob rather than a
 *  data URL because attachments are streamed, not base64-inlined. */
export async function prepareImageUpload(
  file: File,
  keepOriginal = false,
): Promise<PreparedImageUpload> {
  const { el, url } = await measure(file);
  const { width: naturalWidth, height: naturalHeight } = el;
  URL.revokeObjectURL(url);

  if (keepOriginal || PASSTHROUGH.has(file.type)) {
    // Uploaded untouched - the sender opted out, or redrawing would flatten an
    // animation. The only ceiling is MAX_ATTACHMENT_BYTES the upload enforces.
    return { blob: file, mime: file.type, width: naturalWidth, height: naturalHeight };
  }

  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  ctx.drawImage(el, 0, 0, width, height);
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  return { blob: await canvasToBlob(canvas, mime), mime, width, height };
}

/** Load a File, center-crop to a square, resize to `size`×`size`, and return a
 *  JPEG data URL. Keeps avatars small and a single format the server can serve.
 *  Animated formats pass through untouched so they keep playing; CSS crops them. */
export async function resizeImage(
  file: File,
  size = 256,
  maxBytes = MAX_AVATAR_IMAGE_BYTES,
): Promise<string> {
  if (PASSTHROUGH.has(file.type)) return passthroughDataUrl(file, maxBytes);

  const { el, url } = await measure(file);
  URL.revokeObjectURL(url);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const side = Math.min(el.width, el.height);
  const sx = (el.width - side) / 2;
  const sy = (el.height - side) / 2;
  ctx.drawImage(el, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function resizeBanner(
  file: File,
  width = 600,
  height = 200,
): Promise<string> {
  if (PASSTHROUGH.has(file.type)) return passthroughDataUrl(file, MAX_BANNER_IMAGE_BYTES);

  const { el, url } = await measure(file);
  URL.revokeObjectURL(url);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const scale = Math.max(width / el.width, height / el.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (el.width - sw) / 2;
  const sy = (el.height - sh) / 2;
  ctx.drawImage(el, sx, sy, sw, sh, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
