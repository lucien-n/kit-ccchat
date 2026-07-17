import { createInviteBody, type Invite } from "@ccchat/shared";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { randomToken, requireAuth, requireRole, type Env } from "../auth.js";
import { db } from "../db/index.js";
import { invites, users } from "../db/schema";
import { validate } from "../validate.js";

const app = new Hono<Env>();

app.use("*", requireAuth, requireRole("admin"));

/** Derived state is resolved here so the client never re-implements the
 *  expiry/exhaustion rules that /api/auth/register enforces. */
function toInviteView(i: typeof invites.$inferSelect): Invite {
  const exhausted = i.maxUses !== 0 && i.uses >= i.maxUses;
  const expired = i.expiresAt != null && i.expiresAt < Date.now();
  const creator = db.select().from(users).where(eq(users.id, i.createdBy)).get();
  return {
    code: i.code,
    createdAt: i.createdAt,
    createdBy: creator?.displayName ?? "unknown",
    maxUses: i.maxUses,
    uses: i.uses,
    expiresAt: i.expiresAt,
    revoked: !!i.revoked,
    active: !i.revoked && !exhausted && !expired,
    status: i.revoked
      ? "revoked"
      : expired
        ? "expired"
        : exhausted
          ? "used up"
          : "active",
  };
}

app.post("/", validate("json", createInviteBody), async (c) => {
  const { maxUses, expiresInHours } = c.req.valid("json");
  const expiresAt =
    expiresInHours && expiresInHours > 0 ? Date.now() + expiresInHours * 3600_000 : null;

  const invite = {
    code: randomToken(6),
    createdBy: c.get("user").id,
    createdAt: Date.now(),
    maxUses,
    uses: 0,
    expiresAt,
    revoked: 0,
  };
  db.insert(invites).values(invite).run();
  return c.json({ invite: toInviteView(invite) });
});

app.get("/", (c) => {
  const list = db.select().from(invites).orderBy(desc(invites.createdAt)).all();
  return c.json({ invites: list.map(toInviteView) });
});

/** The row is kept rather than deleted so the list stays an audit trail. */
app.post("/:code/revoke", (c) => {
  const code = String(c.req.param("code"));
  const invite = db.select().from(invites).where(eq(invites.code, code)).get();
  if (!invite) return c.json({ error: "no such invite" }, 404);

  db.update(invites).set({ revoked: 1 }).where(eq(invites.code, code)).run();
  return c.json({ invite: toInviteView({ ...invite, revoked: 1 }) });
});

export default app;
