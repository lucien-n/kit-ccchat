import { ServerEventType } from "@ccchat/shared";
import { and, desc, eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import { hasRole, requireAuth, type Env } from "../auth.js";
import { db } from "../db/index.js";
import { messages } from "../db/schema";
import { hub } from "../hub.js";
import { toMessageView } from "../views.js";

const app = new Hono<Env>();

app.use("*", requireAuth);

/** Message history for a channel, newest-first, keyset-paginated by `before`
 *  (a message createdAt timestamp). Deleted messages are omitted. */
app.get("/:channelId", (c) => {
  const channelId = c.req.param("channelId");
  const before = Number(c.req.query("before"));
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);

  const rows = db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        eq(messages.deleted, 0),
        Number.isFinite(before) && before > 0
          ? lt(messages.createdAt, before)
          : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .all();

  // Queried newest-first so `limit` takes the latest; the client wants oldest-first.
  return c.json({ messages: rows.reverse().map(toMessageView) });
});

/** Delete a message. Allowed for the author or any admin/owner. Soft delete so
 *  moderation stays auditable. Broadcasts the removal to everyone live. */
app.delete("/:id", (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const msg = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!msg || msg.deleted) return c.json({ error: "not found" }, 404);

  if (msg.authorId !== user.id && !hasRole(user, "admin"))
    return c.json({ error: "forbidden" }, 403);

  db.update(messages).set({ deleted: 1 }).where(eq(messages.id, id)).run();
  hub.broadcast({ type: ServerEventType.Message_Deleted, id, channelId: msg.channelId });
  return c.json({ ok: true });
});

export default app;
