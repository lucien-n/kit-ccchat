import { IMAGE_MAX_DIMENSION, MAX_MESSAGE_IMAGE_BYTES } from "@ccchat/shared";

export interface PreparedImage {
  image: string;
  width: number;
  height: number;
}

/** Formats we upload untouched. Redrawing one onto a canvas keeps a single
 *  frame, so a GIF would arrive as a still and a WebP would lose its alpha. */
const PASSTHROUGH = new Set(["image/gif", "image/webp"]);

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

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read image"));
    reader.readAsDataURL(file);
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const { el, url } = await measure(file);
  const { width: naturalWidth, height: naturalHeight } = el;
  URL.revokeObjectURL(url);

  if (PASSTHROUGH.has(file.type)) {
    if (file.size > MAX_MESSAGE_IMAGE_BYTES) {
      throw new Error(
        `that ${file.type === "image/gif" ? "gif" : "image"} is too large (max ${MAX_MESSAGE_IMAGE_BYTES / 1_000_000}MB)`,
      );
    }
    return { image: await readDataUrl(file), width: naturalWidth, height: naturalHeight };
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
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return { image: canvas.toDataURL(type, 0.85), width, height };
}

/** Load a File, center-crop to a square, resize to `size`×`size`, and return a
 *  JPEG data URL. Keeps avatars small and a single format the server can serve. */
export async function resizeImage(file: File, size = 256): Promise<string> {
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
