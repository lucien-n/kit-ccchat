import { Hono } from 'hono';
import { and, asc, count, eq, gt, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { channelReads, channels, messages } from '../db/schema.js';
import { newId, requireAuth, requireRole, type Env } from '../auth.js';

const app = new Hono<Env>();

app.use('*', requireAuth);

app.get('/', (c) => {
  const list = db
    .select()
    .from(channels)
    .orderBy(asc(channels.position), asc(channels.createdAt))
    .all();
  return c.json({ channels: list });
});

/** Unread counts for the current user, keyed by channel id. A message counts as
 *  unread if it's newer than the user's read marker (defaulting to when they
 *  joined) and wasn't sent by them. */
app.get('/unreads', (c) => {
  const user = c.get('user');
  const reads = db
    .select()
    .from(channelReads)
    .where(eq(channelReads.userId, user.id))
    .all();
  const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadAt]));

  const unreads: Record<string, number> = {};
  for (const ch of db.select().from(channels).all()) {
    if (ch.type !== 'text') continue;
    const since = readMap.get(ch.id) ?? user.createdAt;
    const row = db
      .select({ n: count() })
      .from(messages)
      .where(
        and(
          eq(messages.channelId, ch.id),
          eq(messages.deleted, 0),
          ne(messages.authorId, user.id),
          gt(messages.createdAt, since),
        ),
      )
      .get();
    unreads[ch.id] = row?.n ?? 0;
  }
  return c.json({ unreads });
});

app.post('/:id/read', (c) => {
  const channelId = c.req.param('id');
  const now = Date.now();
  db.insert(channelReads)
    .values({ userId: c.get('user').id, channelId, lastReadAt: now })
    .onConflictDoUpdate({
      target: [channelReads.userId, channelReads.channelId],
      set: { lastReadAt: now },
    })
    .run();
  return c.json({ ok: true });
});

app.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const type = body?.type === 'voice' ? 'voice' : 'text';
  if (!/^[\w\- ]{1,32}$/.test(name)) return c.json({ error: 'invalid channel name' }, 400);

  const channel = {
    id: newId(),
    name,
    type,
    position: db.select().from(channels).all().length,
    createdAt: Date.now(),
  };
  db.insert(channels).values(channel).run();
  return c.json({ channel });
});

app.delete('/:id', requireRole('admin'), (c) => {
  const id = String(c.req.param('id'));
  db.delete(channels).where(eq(channels.id, id)).run();
  return c.json({ ok: true });
});

export default app;
