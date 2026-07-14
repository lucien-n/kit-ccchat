import { Hono } from 'hono';
import { desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invites } from '../db/schema.js';
import { randomToken, requireAuth, requireRole, type Env } from '../auth.js';

const app = new Hono<Env>();

// Only admins/owner can mint or view invites.
app.use('*', requireAuth, requireRole('admin'));

/** Create an invite code. Body: { maxUses?, expiresInHours? } */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const maxUses = Number.isFinite(body?.maxUses) ? Math.max(0, Math.floor(body.maxUses)) : 1;
  const expiresInHours = Number(body?.expiresInHours);
  const expiresAt =
    Number.isFinite(expiresInHours) && expiresInHours > 0
      ? Date.now() + expiresInHours * 3600_000
      : null;

  const invite = {
    code: randomToken(6),
    createdBy: c.get('user').id,
    createdAt: Date.now(),
    maxUses,
    uses: 0,
    expiresAt,
    revoked: 0,
  };
  db.insert(invites).values(invite).run();
  return c.json({ invite });
});

app.get('/', (c) => {
  const list = db.select().from(invites).orderBy(desc(invites.createdAt)).all();
  return c.json({ invites: list });
});

export default app;
