import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invites, users } from '../db/schema.js';
import {
  createSession,
  destroySession,
  hashPassword,
  newId,
  requireAuth,
  verifyPassword,
  type Env,
} from '../auth.js';
import { toPublicUser } from '../views.js';

const app = new Hono<Env>();

const publicUser = toPublicUser;

app.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const inviteCode = String(body?.inviteCode ?? '').trim();
  const username = String(body?.username ?? '').trim().toLowerCase();
  const displayName = String(body?.displayName ?? '').trim() || username;
  const password = String(body?.password ?? '');

  if (!inviteCode) return c.json({ error: 'invite code required' }, 400);
  if (!/^[a-z0-9_.-]{2,24}$/.test(username))
    return c.json({ error: 'username must be 2-24 chars: a-z 0-9 _ . -' }, 400);
  if (password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);

  const invite = db.select().from(invites).where(eq(invites.code, inviteCode)).get();
  if (!invite || invite.revoked) return c.json({ error: 'invalid invite code' }, 400);
  if (invite.expiresAt && invite.expiresAt < Date.now())
    return c.json({ error: 'invite code expired' }, 400);
  if (invite.maxUses !== 0 && invite.uses >= invite.maxUses)
    return c.json({ error: 'invite code already used up' }, 400);

  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) return c.json({ error: 'username taken' }, 409);

  const user = {
    id: newId(),
    username,
    displayName,
    passwordHash: hashPassword(password),
    role: 'member',
    createdAt: Date.now(),
    banned: 0,
  };
  // One transaction: an account must never come into existence without its
  // invite being counted, or a single-use link would let a second person in.
  db.transaction((tx) => {
    tx.insert(users).values(user).run();
    tx.update(invites)
      .set({ uses: sql`${invites.uses} + 1` })
      .where(eq(invites.code, inviteCode))
      .run();
  });

  const token = createSession(user.id);
  return c.json({ token, user: publicUser(user) });
});

app.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const username = String(body?.username ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user || !verifyPassword(password, user.passwordHash))
    return c.json({ error: 'invalid username or password' }, 401);
  if (user.banned) return c.json({ error: 'account banned' }, 403);

  const token = createSession(user.id);
  return c.json({ token, user: publicUser(user) });
});

app.post('/logout', requireAuth, async (c) => {
  const header = c.req.header('Authorization');
  if (header?.startsWith('Bearer ')) destroySession(header.slice(7));
  return c.json({ ok: true });
});

app.get('/me', requireAuth, (c) => c.json({ user: publicUser(c.get('user')) }));

export default app;
