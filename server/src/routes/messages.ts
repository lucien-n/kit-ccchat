import { editMessageBody, ServerEventType } from "@ccchat/shared";
import { and, desc, eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import { can, requireAuth, type Env } from "../auth.js";
import { db } from "../db/index.js";
import { messages } from "../db/schema";
import { hub } from "../hub.js";
import { validate } from "../validate.js";
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

/** Edit a message. Author only: an admin may remove someone's words but never
 *  rewrite them. `editedAt` marks it so the client can show "(edited)". */
app.patch("/:id", validate("json", editMessageBody), (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const { content } = c.req.valid("json");

  const msg = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!msg || msg.deleted) return c.json({ error: "not found" }, 404);
  if (msg.systemEvent) return c.json({ error: "cannot edit a system message" }, 400);
  if (msg.authorId !== user.id) return c.json({ error: "forbidden" }, 403);

  const editedAt = Date.now();
  db.update(messages).set({ content, editedAt }).where(eq(messages.id, id)).run();
  const view = toMessageView({ ...msg, content, editedAt });
  hub.broadcast({ type: ServerEventType.Message_Edited, message: view });
  return c.json({ message: view });
});

/** Delete a message. Allowed for the author or any admin/owner. Soft delete so
 *  moderation stays auditable. Broadcasts the removal to everyone live. */
app.delete("/:id", (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const msg = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!msg || msg.deleted) return c.json({ error: "not found" }, 404);

  if (msg.authorId !== user.id && !can(user, "deleteAnyMessage"))
    return c.json({ error: "forbidden" }, 403);

  db.update(messages).set({ deleted: 1 }).where(eq(messages.id, id)).run();
  hub.broadcast({ type: ServerEventType.Message_Deleted, id, channelId: msg.channelId });
  return c.json({ ok: true });
});

export default app;
