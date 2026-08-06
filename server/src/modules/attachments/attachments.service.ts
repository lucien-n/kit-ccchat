import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_FILENAME,
  MAX_ATTACHMENTS_PER_MESSAGE,
  type MessageAttachment,
} from "@motus/shared";
import { and, asc, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { newId } from "../../auth.js";
import { safePathOf } from "../../blob.js";
import { db } from "../../db/index.js";
import { messageAttachmentsTable, type MessageAttachmentRow } from "../../db/schema";
import {
  ATTACHMENT_TTL_DAYS,
  ATTACHMENT_TTL_THRESHOLD_BYTES,
  ATTACHMENTS_DIR,
} from "../../env.js";
import { httpError } from "../../http/errors.js";
import { sniffMime } from "../../images.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// An upload is claimed by its message within the same send action; anything still
// unattached after this was abandoned (composer closed before sending) and is
// swept regardless of size, so orphaned files can't accumulate forever.
const ORPHAN_GRACE_MS = DAY_MS;

// Images larger than this are almost certainly a bogus client-supplied dimension;
// clamp so a lie in width/height can't reserve an absurd layout box for everyone.
const MAX_IMAGE_DIMENSION = 20_000;

// A stray file must be untouched for this long before reconciliation reaps it, so
// an in-flight upload (writing its `.part`, or renamed but not yet inserted) is
// never mistaken for garbage.
const STRAY_GRACE_MS = 60 * 60 * 1000;

// `id` is always a server-minted uuid, so this only ever matters as a
// belt-and-braces check against a crafted download `:id`.
const pathOf = (id: string) => safePathOf(ATTACHMENTS_DIR, id);

// Created once on first use rather than per upload. Lazy (not at module load) so
// an external mount that appears late still works, and so an unplugged disk fails
// only attachment uploads instead of crashing the whole server at boot.
let dirReady = false;
async function ensureDir() {
  if (dirReady) return;
  await mkdir(ATTACHMENTS_DIR, { recursive: true });
  dirReady = true;
}

// Fire-and-forget: file removal is best-effort cleanup, so it must not block the
// request path (a moderation purge can delete many files at once). `force` already
// ignores a missing file; anything logged here is a real failure (a lock or
// permissions), which reclaimStrayFiles later retries since the row is now gone.
function removeFile(id: string) {
  const path = pathOf(id);
  if (!path) return;
  void rm(path, { force: true }).catch((e) => {
    console.error("[attachments] could not remove file", id, e);
  });
}

/** Clamp a client-declared image dimension to a sane range, or null when absent. */
function clampDimension(v?: number): number | null {
  if (!v || !Number.isFinite(v)) return null;
  return Math.min(Math.max(1, Math.round(v)), MAX_IMAGE_DIMENSION);
}

/** Strip anything that could turn a filename into a path or a control sequence.
 *  The bytes are stored under a uuid regardless; this is only the display name
 *  and the `Content-Disposition` the browser saves under. `\p{Cc}` covers the
 *  control characters without spelling them out literally. */
function safeFilename(name: string): string {
  const cleaned = name
    .replace(/[\p{Cc}/\\]+/gu, "_")
    .replace(/^\.+/, "")
    .trim();
  return (cleaned || "file").slice(0, MAX_ATTACHMENT_FILENAME);
}

function toAttachmentView(r: MessageAttachmentRow): MessageAttachment {
  return {
    id: r.id,
    filename: r.filename,
    sizeBytes: r.sizeBytes,
    mime: r.mime,
    image: r.image === 1,
    width: r.width,
    height: r.height,
    expiresAt: r.expiresAt,
  };
}

/** Stream the request body straight to disk under a fresh id, enforcing the size
 *  cap as bytes arrive (nothing is buffered whole in memory). The first bytes are
 *  sniffed: a file that really is an image keeps its dimensions and will be served
 *  inline; everything else is served as a forced download. */
export async function saveAttachment(
  uploaderId: string,
  meta: { filename: string; mime: string; width?: number; height?: number },
  body: ReadableStream<Uint8Array>,
): Promise<MessageAttachment> {
  await ensureDir();
  const id = newId();
  const finalPath = pathOf(id);
  if (!finalPath) return httpError(500, "could not store attachment");
  const tmpPath = `${finalPath}.part`;

  const out = createWriteStream(tmpPath);
  const source = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
  let size = 0;
  const head = Buffer.alloc(16);
  let headLen = 0;

  try {
    for await (const chunk of source) {
      const buf = chunk as Buffer;
      size += buf.length;
      if (size > MAX_ATTACHMENT_BYTES) {
        source.destroy();
        out.destroy();
        await rm(tmpPath, { force: true });
        return httpError(
          413,
          `attachment too large (max ${Math.round(MAX_ATTACHMENT_BYTES / 1e9)}GB)`,
        );
      }
      if (headLen < head.length) {
        headLen += buf.copy(head, headLen, 0, head.length - headLen);
      }
      if (!out.write(buf)) await once(out, "drain");
    }
    await new Promise<void>((res, rej) =>
      out.end((err?: Error | null) => (err ? rej(err) : res())),
    );
  } catch (e) {
    out.destroy();
    await rm(tmpPath, { force: true });
    throw e;
  }

  if (size === 0) {
    await rm(tmpPath, { force: true });
    return httpError(400, "empty attachment");
  }

  const sniffed = sniffMime(head);
  const isImage = sniffed !== null;
  await rename(tmpPath, finalPath);

  const now = Date.now();
  const expiresAt =
    ATTACHMENT_TTL_DAYS > 0 && size > ATTACHMENT_TTL_THRESHOLD_BYTES
      ? now + ATTACHMENT_TTL_DAYS * DAY_MS
      : null;

  const row: MessageAttachmentRow = {
    id,
    messageId: null,
    uploaderId,
    filename: safeFilename(meta.filename),
    sizeBytes: size,
    // The sniffed type is authoritative for images; a non-image keeps the
    // uploader's declared mime for its icon only - it is served as a download
    // regardless, so a wrong claim there is harmless.
    mime: sniffed ?? meta.mime,
    image: isImage ? 1 : 0,
    width: isImage ? clampDimension(meta.width) : null,
    height: isImage ? clampDimension(meta.height) : null,
    createdAt: now,
    expiresAt,
  };
  db.insert(messageAttachmentsTable).values(row).run();
  return toAttachmentView(row);
}

export function attachmentsOf(messageId: string): MessageAttachment[] {
  return db
    .select()
    .from(messageAttachmentsTable)
    .where(eq(messageAttachmentsTable.messageId, messageId))
    .orderBy(asc(messageAttachmentsTable.createdAt))
    .all()
    .map(toAttachmentView);
}

/** Claim freshly-uploaded, still-unattached files the sender owns onto a message.
 *  Mirrors the message-send path: uploads land orphaned, the create event names
 *  the ids, and only the uploader can bind their own. */
export function attachMessage(messageId: string, uploaderId: string, ids: string[]) {
  if (!ids.length) return;

  db.update(messageAttachmentsTable)
    .set({ messageId })
    .where(
      and(
        inArray(messageAttachmentsTable.id, ids.slice(0, MAX_ATTACHMENTS_PER_MESSAGE)),
        eq(messageAttachmentsTable.uploaderId, uploaderId),
        isNull(messageAttachmentsTable.messageId),
      ),
    )
    .run();
}

export function deleteAttachmentsOf(messageId: string) {
  const gone = db
    .delete(messageAttachmentsTable)
    .where(eq(messageAttachmentsTable.messageId, messageId))
    .returning({ id: messageAttachmentsTable.id })
    .all();

  for (const { id } of gone) removeFile(id);
}

/** The row plus its on-disk path for the download handler. `expiresAt` is left
 *  for the caller to honour, so a file the sweeper has not reached yet still
 *  reads as gone. */
export function readAttachment(
  id: string,
): { row: MessageAttachmentRow; path: string } | null {
  const path = pathOf(id);
  if (!path) return null;
  const row = db
    .select()
    .from(messageAttachmentsTable)
    .where(eq(messageAttachmentsTable.id, id))
    .get();
  return row ? { row, path } : null;
}

/** Delete every expired attachment (row + file) and return the rows removed, so
 *  the sweeper can tell live clients which messages just lost a file. */
export function purgeExpired(now = Date.now()): MessageAttachmentRow[] {
  const expired = db
    .select()
    .from(messageAttachmentsTable)
    .where(
      and(
        isNotNull(messageAttachmentsTable.expiresAt),
        lte(messageAttachmentsTable.expiresAt, now),
      ),
    )
    .all();
  if (!expired.length) return [];

  for (const a of expired) removeFile(a.id);
  db.delete(messageAttachmentsTable)
    .where(
      inArray(
        messageAttachmentsTable.id,
        expired.map((a) => a.id),
      ),
    )
    .run();
  return expired;
}

/** Reclaim uploads that were never bound to a message (the composer was closed
 *  before sending) once they age past the grace window. Without this, abandoned
 *  uploads below the TTL size threshold would never expire and leak forever. */
export function purgeOrphans(now = Date.now()): number {
  const orphans = db
    .select({ id: messageAttachmentsTable.id })
    .from(messageAttachmentsTable)
    .where(
      and(
        isNull(messageAttachmentsTable.messageId),
        lte(messageAttachmentsTable.createdAt, now - ORPHAN_GRACE_MS),
      ),
    )
    .all();
  if (!orphans.length) return 0;

  for (const { id } of orphans) removeFile(id);
  db.delete(messageAttachmentsTable)
    .where(
      inArray(
        messageAttachmentsTable.id,
        orphans.map((o) => o.id),
      ),
    )
    .run();
  return orphans.length;
}

/** Reconcile the directory against the DB: delete any file (or leftover `.part`)
 *  that no row references and that hasn't been touched within the grace window.
 *  This is the backstop that guarantees a deleted or abandoned attachment really
 *  leaves the disk even when the row-driven paths miss it - an unlink that was
 *  blocked by a transient lock, a `.part` from a crashed upload, or a file whose
 *  row was already gone. The grace window keeps it from reaping a live upload. */
export async function reclaimStrayFiles(now = Date.now()): Promise<number> {
  let names: string[];
  try {
    names = await readdir(ATTACHMENTS_DIR);
  } catch {
    return 0; // directory not created yet - nothing to reconcile
  }
  if (!names.length) return 0;

  const known = new Set(
    db
      .select({ id: messageAttachmentsTable.id })
      .from(messageAttachmentsTable)
      .all()
      .map((r) => r.id),
  );

  // The entries are independent, so stat/rm each concurrently rather than serially
  // - matters when ATTACHMENTS_DIR points at a slower external disk.
  const reaped = await Promise.all(
    names.map(async (name) => {
      // A finished file is stored under its bare id; an in-flight one is `<id>.part`.
      const id = name.endsWith(".part") ? name.slice(0, -".part".length) : name;
      if (known.has(id)) return 0;

      const path = join(ATTACHMENTS_DIR, name);
      const st = await stat(path).catch(() => null);
      if (!st || !st.isFile() || now - st.mtimeMs < STRAY_GRACE_MS) return 0;

      try {
        await rm(path, { force: true });
        return 1;
      } catch (e) {
        console.error("[attachments] could not remove stray file", name, e);
        return 0;
      }
    }),
  );
  return reaped.reduce((sum: number, n) => sum + n, 0);
}
