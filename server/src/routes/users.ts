import { avatarBody, changePasswordBody, updateProfileBody } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { hashPassword, requireAuth, verifyPassword, type Env } from "../auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema";
import { DATA_DIR } from "../env.js";
import { validate } from "../validate.js";
import { toPublicUser } from "../views.js";

const AVATAR_DIR = join(DATA_DIR, "avatars");
mkdirSync(AVATAR_DIR, { recursive: true });

const MAX_AVATAR_BYTES = 2_000_000;

/** Content type from magic bytes so we serve avatars with the right header.
 *  null = these bytes are not an image we recognise. */
function sniffMime(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF") return "image/webp";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  return null;
}

const app = new Hono<Env>();

/** Hono hands back the *decoded* param, so an id of `..%2Fccchat.sqlite` arrives
 *  as a relative path and join() would walk straight out of AVATAR_DIR. An
 *  avatar is always a direct child of it; anything else is someone probing. */
function avatarPath(id: string): string | null {
  const path = resolve(AVATAR_DIR, id);
  return dirname(path) === AVATAR_DIR ? path : null;
}

/** Serve a user's avatar image. Public (no auth): <img> tags can't send bearer
 *  tokens, and avatars aren't secret. 404 when the user has none. */
app.get("/:id/avatar", (c) => {
  const path = avatarPath(c.req.param("id"));
  if (!path || !existsSync(path)) return c.text("not found", 404);
  const buf = readFileSync(path);
  const mime = sniffMime(buf);
  if (!mime) return c.text("not found", 404);
  c.header("Content-Type", mime);
  // These are attacker-supplied bytes on our own origin, and our own origin is
  // where the session token lives. Never let a browser re-interpret them.
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(buf);
});

app.post("/me/avatar", requireAuth, validate("json", avatarBody), async (c) => {
  const user = c.get("user");
  const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(
    c.req.valid("json").image,
  );
  if (!m) return c.json({ error: "invalid image" }, 400);

  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_AVATAR_BYTES)
    return c.json({ error: "image too large (max 2MB)" }, 400);
  // The data: prefix is just a claim the uploader makes. Trust the bytes.
  if (!sniffMime(buf)) return c.json({ error: "invalid image" }, 400);

  writeFileSync(join(AVATAR_DIR, user.id), buf);
  const avatarVersion = Date.now();
  db.update(users).set({ avatarVersion }).where(eq(users.id, user.id)).run();
  return c.json({ avatarVersion });
});

app.delete("/me/avatar", requireAuth, (c) => {
  const user = c.get("user");
  const path = join(AVATAR_DIR, user.id);
  if (existsSync(path)) rmSync(path);
  db.update(users).set({ avatarVersion: null }).where(eq(users.id, user.id)).run();
  return c.json({ ok: true });
});

app.patch("/me", requireAuth, validate("json", updateProfileBody), async (c) => {
  const user = c.get("user");
  const { displayName } = c.req.valid("json");

  db.update(users).set({ displayName }).where(eq(users.id, user.id)).run();
  return c.json({ user: toPublicUser({ ...user, displayName }) });
});

app.post("/me/password", requireAuth, validate("json", changePasswordBody), async (c) => {
  const user = c.get("user");
  const { currentPassword, newPassword } = c.req.valid("json");

  if (!verifyPassword(currentPassword, user.passwordHash))
    return c.json({ error: "current password is incorrect" }, 403);

  db.update(users)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(users.id, user.id))
    .run();
  return c.json({ ok: true });
});

export default app;
