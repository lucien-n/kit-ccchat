import { formatBytes } from "$lib/format";
import { isImageType, prepareImageUpload } from "$lib/image";
import { MAX_ATTACHMENT_BYTES, type MessageAttachment } from "@motus/shared";
import { apiBase, ApiError } from "./http";
import { authToken } from "./token.svelte";

export function attachmentUrl(id: string): string {
  return `${apiBase()}/api/attachments/${id}`;
}

export interface UploadOptions {
  onProgress?: (fraction: number) => void;
  keepOriginal?: boolean;
  signal?: AbortSignal;
}

export async function uploadAttachment(
  file: File,
  opts: UploadOptions = {},
): Promise<MessageAttachment> {
  let body: Blob = file;
  let mime = file.type || "application/octet-stream";
  let width: number | undefined;
  let height: number | undefined;

  // image specific prepare with opt-out compression
  if (isImageType(file.type)) {
    const prepared = await prepareImageUpload(file, opts.keepOriginal);
    body = prepared.blob;
    mime = prepared.mime;
    width = prepared.width;
    height = prepared.height;
  }

  if (body.size > MAX_ATTACHMENT_BYTES) {
    throw new ApiError(
      413,
      `that file is too large (max ${formatBytes(MAX_ATTACHMENT_BYTES)})`,
    );
  }

  const params = new URLSearchParams({ name: file.name, mime });
  if (width && height) {
    params.set("width", String(width));
    params.set("height", String(height));
  }

  return new Promise<MessageAttachment>((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new DOMException("upload aborted", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBase()}/api/attachments?${params}`);
    const token = authToken.value;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.onabort = () => reject(new DOMException("upload aborted", "AbortError"));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).attachment);
        } catch {
          reject(new ApiError(xhr.status, "malformed server response"));
        }
        return;
      }
      let message = `upload failed (${xhr.status})`;
      try {
        message = JSON.parse(xhr.responseText).error ?? message;
      } catch {
        /* keep the generic message */
      }
      reject(new ApiError(xhr.status, message));
    };
    xhr.onerror = () => reject(new ApiError(0, "network error during upload"));
    xhr.send(body);
  });
}

export const attachments = {
  upload: uploadAttachment,
};
