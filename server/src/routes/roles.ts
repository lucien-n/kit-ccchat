import {
  createRoleBody,
  ServerEventType,
  setUserRolesBody,
  updateRoleBody,
} from "@ccchat/shared";
import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { newId, requireAuth, requireCan, type Env } from "../auth.js";
import { db } from "../db/index.js";
import { roles, userRoles, users } from "../db/schema";
import { hub } from "../hub.js";
import { authLevel } from "../permissions.js";
import { validate } from "../validate.js";
import { toRoleView } from "../views.js";

const app = new Hono<Env>();

app.use("*", requireAuth);

app.get("/", (c) => {
  const list = db.select().from(roles).orderBy(desc(roles.position)).all();
  return c.json({ roles: list.map(toRoleView) });
});

const notify = () => hub.broadcast({ type: ServerEventType.Roles_Changed });

app.post("/", requireCan("manageRoles"), validate("json", createRoleBody), (c) => {
  const { name, color, permission } = c.req.valid("json");
  const role = {
    id: newId(),
    name,
    color,
    permission,
    position: db.select().from(roles).all().length,
    createdAt: Date.now(),
  };
  db.insert(roles).values(role).run();
  notify();
  return c.json({ role: toRoleView(role) });
});

app.patch("/:id", requireCan("manageRoles"), validate("json", updateRoleBody), (c) => {
  const id = String(c.req.param("id"));
  const patch = c.req.valid("json");
  const existing = db.select().from(roles).where(eq(roles.id, id)).get();
  if (!existing) return c.json({ error: "role not found" }, 404);

  db.update(roles).set(patch).where(eq(roles.id, id)).run();
  notify();
  return c.json({ role: toRoleView({ ...existing, ...patch }) });
});

app.delete("/:id", requireCan("manageRoles"), (c) => {
  const id = String(c.req.param("id"));
  db.transaction((tx) => {
    tx.delete(userRoles).where(eq(userRoles.roleId, id)).run();
    tx.delete(roles).where(eq(roles.id, id)).run();
  });
  notify();
  return c.json({ ok: true });
});

app.put(
  "/members/:userId",
  requireCan("manageRoles"),
  validate("json", setUserRolesBody),
  (c) => {
    const actor = c.get("user");
    const userId = String(c.req.param("userId"));
    const { roleIds } = c.req.valid("json");

    const target = db.select().from(users).where(eq(users.id, userId)).get();
    if (!target) return c.json({ error: "user not found" }, 404);
    if (authLevel(target) > authLevel(actor))
      return c.json({ error: "target outranks you" }, 403);

    if (roleIds.length) {
      const found = db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.id, roleIds))
        .all();
      if (found.length !== new Set(roleIds).size)
        return c.json({ error: "unknown role" }, 400);
    }

    db.transaction((tx) => {
      tx.delete(userRoles).where(eq(userRoles.userId, userId)).run();
      if (roleIds.length)
        tx.insert(userRoles)
          .values(roleIds.map((roleId) => ({ userId, roleId })))
          .run();
    });
    notify();
    return c.json({ ok: true });
  },
);

export default app;
