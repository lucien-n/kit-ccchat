import { ChannelType, type Channel, type CreateChannelBody } from "@ccchat/shared";
import { and, asc, count, eq, gt, isNull, ne } from "drizzle-orm";
import { newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { channelReads, channels, messages, type User } from "../../db/schema";

/** `type` is a plain TEXT column, so this cast is the boundary where a db string
 *  becomes the union the rest of the app relies on. */
function toChannelView(row: typeof channels.$inferSelect): Channel {
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
    .from(channels)
    .orderBy(asc(channels.position), asc(channels.createdAt))
    .all()
    .map(toChannelView);
}

/** Unread counts for the given user, keyed by channel id. A message counts as
 *  unread if it's newer than the user's read marker (defaulting to when they
 *  joined) and wasn't sent by them. */
export function unreadCounts(user: User): Record<string, number> {
  const reads = db
    .select()
    .from(channelReads)
    .where(eq(channelReads.userId, user.id))
    .all();
  const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadAt]));

  const unreads: Record<string, number> = {};
  for (const ch of db.select().from(channels).all()) {
    if (ch.type !== ChannelType.Text) continue;
    const since = readMap.get(ch.id) ?? user.createdAt;
    const row = db
      .select({ n: count() })
      .from(messages)
      .where(
        and(
          eq(messages.channelId, ch.id),
          eq(messages.deleted, 0),
          isNull(messages.systemEvent),
          ne(messages.authorId, user.id),
          gt(messages.createdAt, since),
        ),
      )
      .get();
    unreads[ch.id] = row?.n ?? 0;
  }
  return unreads;
}

export function markRead(userId: string, channelId: string) {
  const now = Date.now();
  db.insert(channelReads)
    .values({ userId, channelId, lastReadAt: now })
    .onConflictDoUpdate({
      target: [channelReads.userId, channelReads.channelId],
      set: { lastReadAt: now },
    })
    .run();
}

export function createChannel({ name, type }: CreateChannelBody) {
  const channel = {
    id: newId(),
    name,
    type,
    position: db.select().from(channels).all().length,
    createdAt: Date.now(),
  };
  db.insert(channels).values(channel).run();
  return channel;
}

export function deleteChannel(id: string) {
  db.delete(channels).where(eq(channels.id, id)).run();
}
