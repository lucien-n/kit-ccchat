import { muteBody, type ModeratedMember } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { Hono, type Context, type Next } from "hono";
import { requireAuth, requireCan, type Env } from "../auth.js";
import { db } from "../db/index.js";
import { sessions, users, type User } from "../db/schema";
import { authLevel } from "../permissions.js";
import { validate } from "../validate.js";
import { toModeratedMember } from "../views.js";

type ModEnv = { Variables: Env["Variables"] & { target: User } };

const app = new Hono<ModEnv>();

app.use("*", requireAuth, requireCan("moderateMembers"));

/** Nobody may act on their own rank or above, so an admin can't ban the owner or
 *  another admin. */
async function loadTarget(c: Context<ModEnv>, next: Next) {
  const actor = c.get("user");
  const target = db
    .select()
    .from(users)
    .where(eq(users.id, c.req.param("id") ?? ""))
    .get();
  if (!target) return c.json({ error: "user not found" }, 404);
  if (target.id === actor.id)
    return c.json({ error: "you cannot moderate yourself" }, 400);
  if (authLevel(target) >= authLevel(actor))
    return c.json({ error: "target outranks you" }, 403);
  c.set("target", target);
  await next();
}

const endSessions = (userId: string) =>
  db.delete(sessions).where(eq(sessions.userId, userId)).run();

const setOnTarget = (c: Context<ModEnv>, patch: Partial<User>) =>
  db
    .update(users)
    .set(patch)
    .where(eq(users.id, c.get("target").id))
    .run();

/** Kick ends every active session. With invite-only signup that forces a fresh
 *  invite to return. */
app.post("/:id/kick", loadTarget, (c) => {
  endSessions(c.get("target").id);
  return c.json({ ok: true });
});

app.post("/:id/ban", loadTarget, (c) => {
  setOnTarget(c, { banned: 1 });
  endSessions(c.get("target").id);
  return c.json({ ok: true });
});

app.post("/:id/unban", loadTarget, (c) => {
  setOnTarget(c, { banned: 0 });
  return c.json({ ok: true });
});

app.post("/:id/mute", loadTarget, validate("json", muteBody), async (c) => {
  const mutedUntil = Date.now() + c.req.valid("json").minutes * 60_000;
  setOnTarget(c, { mutedUntil });
  return c.json({ ok: true, mutedUntil });
});

app.post("/:id/unmute", loadTarget, (c) => {
  setOnTarget(c, { mutedUntil: null });
  return c.json({ ok: true });
});

app.get("/members", (c) => {
  const members: ModeratedMember[] = db.select().from(users).all().map(toModeratedMember);
  return c.json({ members });
});

export default app;
