import {
  MATCH_CLOSE,
  MATCH_OPEN,
  SearchSort,
  type SearchQuery,
  type SearchResults,
} from "@ccchat/shared";
import { and, count, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messages, type Message } from "../../db/schema";
import { excerpt, toMessageView } from "../../views.js";

const MIN_TERM_LENGTH = 2;
const EMPTY: SearchResults = { hits: [], total: 0, hasMore: false };

/** FTS5 reserves its own syntax in the query string: AND, OR, NOT, NEAR, quotes,
 *  parentheses, `*` and a leading `-`. People type prose, and a stray quote or a
 *  trailing AND is a syntax error rather than a search. So the words are taken
 *  and the expression rebuilt: each term quoted (making it all literal) and given
 *  a `*` so search-as-you-type matches partial words. All terms must match. */
function matchExpression(q: string): string | null {
  const terms = q
    .split(/\s+/)
    .map((t) => t.replaceAll('"', "").trim())
    .filter((t) => t.length > 0)
    .map((t) => `"${t}"*`);
  return terms.length > 0 ? terms.join(" ") : null;
}

/** Text is optional: filtering to one person, or to one person in one channel,
 *  is a search in its own right. Without text there is nothing to rank or to
 *  highlight, so those results are always newest-first with a plain excerpt. */
export function search(params: SearchQuery): SearchResults {
  const match =
    params.q.trim().length >= MIN_TERM_LENGTH ? matchExpression(params.q) : null;
  if (!match) {
    return params.channelId || params.authorId ? byFilter(params) : EMPTY;
  }
  return byText(params, match);
}

function byFilter(params: SearchQuery): SearchResults {
  const where = and(
    eq(messages.deleted, 0),
    isNull(messages.systemEvent),
    params.channelId ? eq(messages.channelId, params.channelId) : undefined,
    params.authorId ? eq(messages.authorId, params.authorId) : undefined,
  );

  const rows = db
    .select()
    .from(messages)
    .where(where)
    .orderBy(desc(messages.createdAt), sql`rowid DESC`)
    .limit(params.limit)
    .offset(params.offset)
    .all();

  const total =
    db.select({ total: count() }).from(messages).where(where).get()?.total ?? 0;

  return {
    hits: rows.map((m) => ({ message: toMessageView(m), snippet: excerpt(m.content) })),
    total,
    hasMore: params.offset + rows.length < total,
  };
}

function textConditions({ channelId, authorId }: SearchQuery, match: string): SQL {
  const parts = [
    sql`messages_fts MATCH ${match}`,
    sql`m.deleted = 0`,
    sql`m.system_event IS NULL`,
  ];
  if (channelId) parts.push(sql`m.channel_id = ${channelId}`);
  if (authorId) parts.push(sql`m.author_id = ${authorId}`);
  return sql.join(parts, sql` AND `);
}

type Row = Message & { snippet: string };

function byText(params: SearchQuery, match: string): SearchResults {
  const where = textConditions(params, match);
  // Two messages can share a millisecond, so rowid (insertion order) breaks the
  // tie. Without it "newest first" is whatever SQLite feels like that day.
  const order =
    params.sort === SearchSort.Relevance
      ? sql`bm25(messages_fts), m.rowid DESC`
      : sql`m.created_at DESC, m.rowid DESC`;

  try {
    const rows = db.all<Row>(sql`
      SELECT m.id AS id,
             m.channel_id AS channelId,
             m.author_id AS authorId,
             m.content AS content,
             m.created_at AS createdAt,
             m.edited_at AS editedAt,
             m.deleted AS deleted,
             m.reply_to_id AS replyToId,
             m.system_event AS systemEvent,
             snippet(messages_fts, 0, ${MATCH_OPEN}, ${MATCH_CLOSE}, '…', 18) AS snippet
      FROM messages_fts
      JOIN messages m ON m.rowid = messages_fts.rowid
      WHERE ${where}
      ORDER BY ${order}
      LIMIT ${params.limit} OFFSET ${params.offset}
    `);

    const counted = db.get<{ total: number }>(sql`
      SELECT count(*) AS total
      FROM messages_fts
      JOIN messages m ON m.rowid = messages_fts.rowid
      WHERE ${where}
    `);
    const total = counted?.total ?? 0;

    return {
      hits: rows.map((r) => ({ message: toMessageView(r), snippet: r.snippet })),
      total,
      hasMore: params.offset + rows.length < total,
    };
  } catch {
    // Every reachable syntax error should have been rebuilt away above, but an
    // unsearchable query is a "no results", never a 500 in someone's face.
    return EMPTY;
  }
}
