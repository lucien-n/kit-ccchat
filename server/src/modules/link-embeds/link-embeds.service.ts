import {
  MAX_EMBEDS_PER_MESSAGE,
  ServerEventType,
  type MessageEmbed,
} from "@motus/shared";
import { and, asc, eq } from "drizzle-orm";
import { newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { findById } from "../../db/query.js";
import { messageEmbedsTable, messagesTable, type MessageEmbedRow } from "../../db/schema";
import { LINK_EMBED_CACHE_MIN, LINK_EMBEDS_ENABLED } from "../../env.js";
import { httpError } from "../../http/errors.js";
import { hub } from "../../hub.js";
import { parseOpenGraph, type OgData } from "./open-graph.js";
import { safeFetch, UnsafeUrlError, type FetchResult } from "./safe-fetch.js";

// Big HTML pages (YouTube) exceed 1MB but carry OG tags in the head, so read to
// </head> and truncate rather than reject. Images get a hard cap.
const HTML_LIMITS = {
  maxBytes: 1024 * 1024,
  timeoutMs: 10_000,
  acceptContentTypePrefixes: ["text/html", "application/xhtml"] as const,
  truncateDontReject: true,
  stopAtHeadEnd: true,
};
const IMAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  timeoutMs: 10_000,
  acceptContentTypePrefixes: ["image/"] as const,
};

const CACHE_MAX_ENTRIES = 500;

// SVG can carry script, so never stream a remote SVG into an <img>.
const BLOCKED_IMAGE_TYPES = ["image/svg+xml"];

const URL_RE = /\bhttps?:\/\/[^\s<>"'`)\]}]+/gi;

/** Distinct http(s) URLs in order, capped at MAX_EMBEDS_PER_MESSAGE. Trailing
 *  sentence punctuation is trimmed ("see https://x.com/a." → no full stop). */
export function extractUrls(content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of content.matchAll(URL_RE)) {
    const url = match[0].replace(/[.,;:!?]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_EMBEDS_PER_MESSAGE) break;
  }
  return out;
}

// null data is a remembered negative, so a repeated bad link isn't refetched.
const cache = new Map<string, { data: OgData | null; expiresAt: number }>();

function cacheGet(url: string): { data: OgData | null } | undefined {
  const hit = cache.get(url);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(url);
    return undefined;
  }
  return hit;
}

function cacheSet(url: string, data: OgData | null): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(url, { data, expiresAt: Date.now() + LINK_EMBED_CACHE_MIN * 60_000 });
}

function embeddable(data: OgData): boolean {
  return Boolean(data.title || data.description || data.imageUrl);
}

/** Never throws: any failure resolves to null so one bad link can't sink the
 *  batch. Uses and fills the cache. */
async function unfurlOne(url: string): Promise<OgData | null> {
  const cached = cacheGet(url);
  if (cached) return cached.data;

  try {
    const res: FetchResult = await safeFetch(url, HTML_LIMITS);
    const data = parseOpenGraph(res.body.toString("utf8"), res.finalUrl);
    const result = embeddable(data) ? data : null;
    cacheSet(url, result);
    return result;
  } catch (e) {
    // UnsafeUrlError is expected noise; a real fetch error is worth a line.
    if (!(e instanceof UnsafeUrlError)) {
      console.warn("[link-embeds] unfurl failed", url, (e as Error).message);
    }
    cacheSet(url, null);
    return null;
  }
}

function toEmbedView(row: MessageEmbedRow): MessageEmbed {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    siteName: row.siteName,
    image: row.imageUrl !== null,
  };
}

export function embedsOf(messageId: string): MessageEmbed[] {
  return db
    .select()
    .from(messageEmbedsTable)
    .where(and(eq(messageEmbedsTable.messageId, messageId), eq(messageEmbedsTable.removed, 0)))
    .orderBy(asc(messageEmbedsTable.position))
    .all()
    .map(toEmbedView);
}

/** Dismiss one card. Soft-delete (see the table) so a re-unfurl won't re-add it;
 *  scoped to its message so an id from elsewhere can't be targeted. Returns
 *  whether a live row changed. */
export function markEmbedRemoved(embedId: string, messageId: string): boolean {
  return (
    db
      .update(messageEmbedsTable)
      .set({ removed: 1 })
      .where(
        and(
          eq(messageEmbedsTable.id, embedId),
          eq(messageEmbedsTable.messageId, messageId),
          eq(messageEmbedsTable.removed, 0),
        ),
      )
      .run().changes > 0
  );
}

/** Unfurl a message's URLs, store the cards, and broadcast Message_Embeds so open
 *  clients patch in place. Fire-and-forget safe: re-checks the message exists and
 *  swallows errors. On edit, also clears embeds a removed link left behind. */
export async function unfurlMessage(
  messageId: string,
  channelId: string,
  content: string,
): Promise<void> {
  if (!LINK_EMBEDS_ENABLED) return;

  const urls = extractUrls(content);

  // Existing rows give us the URLs the author dismissed (tombstones to honor) and
  // whether any card is currently visible (so an edit dropping the last link
  // still broadcasts an empty list to clear it).
  const existing = db
    .select({ url: messageEmbedsTable.url, removed: messageEmbedsTable.removed })
    .from(messageEmbedsTable)
    .where(eq(messageEmbedsTable.messageId, messageId))
    .all();
  const dismissed = new Set(existing.filter((e) => e.removed === 1).map((e) => e.url));
  const hadVisible = existing.some((e) => e.removed === 0);

  const toFetch = urls.filter((u) => !dismissed.has(u));
  if (!toFetch.length && !hadVisible) return;

  const results = await Promise.all(toFetch.map(unfurlOne));

  // Deleted while we fetched? Drop it - the FK cascade already cleared any rows.
  const msg = findById(messagesTable, messageId);
  if (!msg || msg.deleted) return;

  const now = Date.now();
  const rows: MessageEmbedRow[] = [];
  results.forEach((data, i) => {
    if (!data) return;
    rows.push({
      id: newId(),
      messageId,
      url: toFetch[i],
      title: data.title,
      description: data.description,
      siteName: data.siteName,
      imageUrl: data.imageUrl,
      position: i,
      createdAt: now,
      removed: 0,
    });
  });

  db.transaction((tx) => {
    // Replace the live cards; keep dismissed tombstones so they keep suppressing.
    tx.delete(messageEmbedsTable)
      .where(and(eq(messageEmbedsTable.messageId, messageId), eq(messageEmbedsTable.removed, 0)))
      .run();
    if (rows.length) tx.insert(messageEmbedsTable).values(rows).run();
  });

  if (!rows.length && !hadVisible) return;

  hub.broadcast({
    type: ServerEventType.Message_Embeds,
    id: messageId,
    channelId,
    embeds: rows.map(toEmbedView),
  });
}

/** Proxy an embed's thumbnail so the reader's IP never reaches the linked site.
 *  The URL was SSRF-validated at unfurl time and re-validated by safeFetch; the
 *  client names the embed only by id, so it can't steer this at another host. */
export async function fetchEmbedImage(
  embedId: string,
): Promise<{ body: Buffer; contentType: string }> {
  const row = findById(messageEmbedsTable, embedId);
  if (!row || !row.imageUrl) return httpError(404, "not found");

  try {
    const res = await safeFetch(row.imageUrl, IMAGE_LIMITS);
    if (BLOCKED_IMAGE_TYPES.some((t) => res.contentType.startsWith(t))) {
      return httpError(415, "unsupported image type");
    }
    return { body: res.body, contentType: res.contentType };
  } catch {
    return httpError(502, "could not fetch image");
  }
}
