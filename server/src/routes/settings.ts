import { Hono } from 'hono';
import { requireAuth, requireRole, type Env } from '../auth.js';
import { communityName, setSetting } from '../settings.js';
import { hub } from '../hub.js';

const app = new Hono<Env>();

app.use('*', requireAuth);

app.patch('/', requireRole('owner'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = String(body?.communityName ?? '').trim();
  if (!name) return c.json({ error: 'community name required' }, 400);
  if (name.length > 60) return c.json({ error: 'community name is too long' }, 400);

  setSetting('communityName', name);
  hub.broadcast({ type: 'community.renamed', name });

  return c.json({ communityName: communityName() });
});

export default app;
