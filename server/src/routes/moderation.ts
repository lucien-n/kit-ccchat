import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { hasRole, requireAuth, requireRole, type Env } from '../auth.js';
import type { User } from '../db/schema.js';

const app = new Hono<Env>();

app.use('*', requireAuth, requireRole('admin'));

/** Load the target user and enforce that you can't act on someone your rank or
 *  above (an admin can't ban the owner or another admin; only the owner can). */
function loadTarget(c: any): { target?: User; error?: string; status?: number } {
  const actor = c.get('user') as User;
  const targetId = c.req.param('id');
  const target = db.select().from(users).where(eq(users.id, targetId)).get();
  if (!target) return { error: 'user not found', status: 404 };
  if (target.id === actor.id) return { error: 'you cannot moderate yourself', status: 400 };
  const actorRank = actor.role === 'owner' ? 2 : actor.role === 'admin' ? 1 : 0;
  const targetRank = target.role === 'owner' ? 2 : target.role === 'admin' ? 1 : 0;
  if (targetRank >= actorRank) return { error: 'target outranks you', status: 403 };
  return { target };
}

/** Kick = end all active sessions. With invite-only signup this forces them to
 *  redeem a fresh invite to return. */
app.post('/:id/kick', (c) => {
  const { target, error, status } = loadTarget(c);
  if (error) return c.json({ error }, status as any);
  db.delete(sessions).where(eq(sessions.userId, target!.id)).run();
  return c.json({ ok: true });
});

app.post('/:id/ban', (c) => {
  const { target, error, status } = loadTarget(c);
  if (error) return c.json({ error }, status as any);
  db.update(users).set({ banned: 1 }).where(eq(users.id, target!.id)).run();
  db.delete(sessions).where(eq(sessions.userId, target!.id)).run();
  return c.json({ ok: true });
});

app.post('/:id/unban', (c) => {
  const { target, error, status } = loadTarget(c);
  if (error) return c.json({ error }, status as any);
  db.update(users).set({ banned: 0 }).where(eq(users.id, target!.id)).run();
  return c.json({ ok: true });
});

/** Mute for N minutes (default 60). Body: { minutes } */
app.post('/:id/mute', async (c) => {
  const { target, error, status } = loadTarget(c);
  if (error) return c.json({ error }, status as any);
  const body = await c.req.json().catch(() => ({}));
  const minutes = Number(body?.minutes) > 0 ? Number(body.minutes) : 60;
  db.update(users)
    .set({ mutedUntil: Date.now() + minutes * 60_000 })
    .where(eq(users.id, target!.id))
    .run();
  return c.json({ ok: true, mutedUntil: Date.now() + minutes * 60_000 });
});

app.post('/:id/unmute', (c) => {
  const { target, error, status } = loadTarget(c);
  if (error) return c.json({ error }, status as any);
  db.update(users).set({ mutedUntil: null }).where(eq(users.id, target!.id)).run();
  return c.json({ ok: true });
});

app.get('/members', (c) => {
  const members = db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      banned: users.banned,
      mutedUntil: users.mutedUntil,
      avatarVersion: users.avatarVersion,
    })
    .from(users)
    .all();
  return c.json({ members });
});

export default app;
