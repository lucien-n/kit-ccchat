import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { hashPassword, requireAuth, verifyPassword, type Env } from '../auth.js';
import { toPublicUser } from '../views.js';
import { DATA_DIR } from '../env.js';

const AVATAR_DIR = join(DATA_DIR, 'avatars');
mkdirSync(AVATAR_DIR, { recursive: true });

const MAX_AVATAR_BYTES = 2_000_000;

/** Content type from magic bytes so we serve avatars with the right header. */
function sniffMime(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF') return 'image/webp';
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif';
  return 'application/octet-stream';
}

const app = new Hono<Env>();

/** Serve a user's avatar image. Public (no auth): <img> tags can't send bearer
 *  tokens, and avatars aren't secret. 404 when the user has none. */
app.get('/:id/avatar', (c) => {
  const id = c.req.param('id');
  const path = join(AVATAR_DIR, id);
  if (!existsSync(path)) return c.text('not found', 404);
  const buf = readFileSync(path);
  c.header('Content-Type', sniffMime(buf));
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(buf);
});

app.post('/me/avatar', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(String(body?.image ?? ''));
  if (!m) return c.json({ error: 'invalid image' }, 400);

  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_AVATAR_BYTES) return c.json({ error: 'image too large (max 2MB)' }, 400);

  writeFileSync(join(AVATAR_DIR, user.id), buf);
  const avatarVersion = Date.now();
  db.update(users).set({ avatarVersion }).where(eq(users.id, user.id)).run();
  return c.json({ avatarVersion });
});

app.delete('/me/avatar', requireAuth, (c) => {
  const user = c.get('user');
  const path = join(AVATAR_DIR, user.id);
  if (existsSync(path)) rmSync(path);
  db.update(users).set({ avatarVersion: null }).where(eq(users.id, user.id)).run();
  return c.json({ ok: true });
});

app.patch('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const displayName = String(body?.displayName ?? '').trim();
  if (!displayName || displayName.length > 32)
    return c.json({ error: 'display name must be 1–32 characters' }, 400);

  db.update(users).set({ displayName }).where(eq(users.id, user.id)).run();
  return c.json({ user: toPublicUser({ ...user, displayName }) });
});

app.post('/me/password', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? '');
  const newPassword = String(body?.newPassword ?? '');

  if (!verifyPassword(currentPassword, user.passwordHash))
    return c.json({ error: 'current password is incorrect' }, 403);
  if (newPassword.length < 8)
    return c.json({ error: 'new password must be at least 8 characters' }, 400);

  db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id)).run();
  return c.json({ ok: true });
});

export default app;
