import type { uploadAttachmentQuery } from "@motus/shared";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { AppContext, QueryContext } from "../../http/context.js";
import { httpError } from "../../http/errors.js";
import * as attachmentsService from "./attachments.service.js";

export async function upload(c: QueryContext<typeof uploadAttachmentQuery>) {
  const body = c.req.raw.body;
  if (!body) return httpError(400, "empty attachment");

  const { name, mime, width, height } = c.req.valid("query");
  const attachment = await attachmentsService.saveAttachment(
    c.get("user").id,
    { filename: name, mime, width, height },
    body,
  );
  return c.json({ attachment });
}

type Range = { start: number; end: number };

/** Parse a single `bytes=` range against the file size. Returns null to serve the
 *  whole file (no/unsupported range) and "invalid" for an unsatisfiable one. */
function parseRange(header: string | undefined, size: number): Range | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, s, e] = m;
  if (s === "" && e === "") return "invalid";

  let start: number;
  let end: number;
  if (s === "") {
    const n = Number(e);
    if (n <= 0) return "invalid";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(s);
    end = e === "" ? size - 1 : Math.min(Number(e), size - 1);
  }
  if (start > end || start >= size) return "invalid";
  return { start, end };
}

/** Streamed from disk with Range support so large files resume and seek without
 *  the server holding the whole thing in memory. Served without auth (a media tag
 *  or a download link can't send a bearer token) but only by an unguessable id,
 *  and always as a forced download unless the bytes really are an image. */
export async function download(c: AppContext<"/:id">) {
  const found = attachmentsService.readAttachment(c.req.param("id"));
  if (!found) return httpError(404, "not found");
  const { row, path } = found;

  if (row.expiresAt !== null && row.expiresAt <= Date.now()) {
    return httpError(410, "attachment expired");
  }

  let size: number;
  try {
    size = (await stat(path)).size;
  } catch {
    return httpError(404, "not found");
  }

  const range = parseRange(c.req.header("Range"), size);
  if (range === "invalid") {
    c.header("Content-Range", `bytes */${size}`);
    return c.body(null, 416);
  }

  const inline = row.image === 1;
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(
    row.filename,
  )}`;
  const { start, end } = range ?? { start: 0, end: size - 1 };

  const headers: Record<string, string> = {
    "Content-Type": inline ? row.mime : "application/octet-stream",
    "Content-Disposition": disposition,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    // Addressed by an immutable uuid; a later TTL deletion just 404s, which is
    // acceptable for a client that already cached the bytes.
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;

  const web = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
  return c.body(web, range ? 206 : 200, headers);
}
