import {
  ChannelType,
  channelNameKey,
  type Channel,
  type CreateChannelBody,
} from "@ccchat/shared";
import { and, asc, count, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { newId } from "../../auth.js";
import { db } from "../../db/index.js";
import {
  channelReadsTable,
  channelsTable,
  messageMentionsTable,
  messagesTable,
  type User,
} from "../../db/schema";
import { httpError } from "../../http/errors.js";

function toChannelView(row: typeof channelsTable.$inferSelect): Channel {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ChannelType,
    position: row.position,
  };
}

export function listChannels(): Channel[] {
  return db
    .select()
    .from(channelsTable)
    .orderBy(asc(channelsTable.position), asc(channelsTable.createdAt))
    .all()
    .map(toChannelView);
}

export function unreadCounts(user: User): {
  unreads: Record<string, number>;
  mentions: Record<string, number>;
} {
  const reads = db
    .select()
    .from(channelReadsTable)
    .where(eq(channelReadsTable.userId, user.id))
    .all();
  const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadAt]));

  const unreads: Record<string, number> = {};
  const mentions: Record<string, number> = {};
  for (const ch of db.select().from(channelsTable).all()) {
    if (ch.type !== ChannelType.Text) continue;
    const since = readMap.get(ch.id) ?? user.createdAt;
    const visible = and(
      eq(messagesTable.channelId, ch.id),
      eq(messagesTable.deleted, 0),
      isNull(messagesTable.systemEvent),
      ne(messagesTable.authorId, user.id),
      gt(messagesTable.createdAt, since),
    );

    // One scan of the visible rows: the join matches at most one mention row per
    // message (PK is messageId+userId), so count() stays the plain unread total
    // while the conditional sum picks out the ones that ping this user.
    const row = db
      .select({
        unread: count(),
        mentions: sql<number>`sum(case when ${messagesTable.mentionsEveryone} = 1 or ${messageMentionsTable.userId} is not null then 1 else 0 end)`,
      })
      .from(messagesTable)
      .leftJoin(
        messageMentionsTable,
        and(
          eq(messageMentionsTable.messageId, messagesTable.id),
          eq(messageMentionsTable.userId, user.id),
        ),
      )
      .where(visible)
      .get();

    unreads[ch.id] = row?.unread ?? 0;
    mentions[ch.id] = Number(row?.mentions ?? 0);
  }
  return { unreads, mentions };
}

export function markRead(userId: string, channelId: string) {
  const channel = db
    .select({ id: channelsTable.id })
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .get();
  if (!channel) return;

  const now = Date.now();
  db.insert(channelReadsTable)
    .values({ userId, channelId, lastReadAt: now })
    .onConflictDoUpdate({
      target: [channelReadsTable.userId, channelReadsTable.channelId],
      set: { lastReadAt: now },
    })
    .run();
}

export function isNameTaken(name: string, type: ChannelType, exceptId?: string): boolean {
  const key = channelNameKey(name);
  return db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.type, type))
    .all()
    .some((c) => c.id !== exceptId && channelNameKey(c.name) === key);
}

export function createChannel({ name, type }: CreateChannelBody) {
  // better-sqlite3 is synchronous and the server is one process, so nothing can
  // interleave between this check and the insert below.
  if (isNameTaken(name, type))
    httpError(409, `there's already a ${type} channel called "${name.trim()}"`);

  const channel = {
    id: newId(),
    name,
    type,
    position: db.select().from(channelsTable).all().length,
    createdAt: Date.now(),
  };
  db.insert(channelsTable).values(channel).run();
  return channel;
}

export function renameChannel(id: string, name: string): Channel {
  const existing = db.select().from(channelsTable).where(eq(channelsTable.id, id)).get();
  if (!existing) httpError(404, "channel not found");

  const type = existing.type as ChannelType;
  if (isNameTaken(name, type, id))
    httpError(409, `there's already a ${type} channel called "${name.trim()}"`);

  db.update(channelsTable).set({ name }).where(eq(channelsTable.id, id)).run();
  return toChannelView({ ...existing, name });
}

export function deleteChannel(id: string) {
  db.delete(channelsTable).where(eq(channelsTable.id, id)).run();
}
