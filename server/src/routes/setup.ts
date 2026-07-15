import { Hono } from 'hono';
import { createSession, type Env } from '../auth.js';
import { needsSetup, seedCommunity } from '../bootstrap.js';
import { toPublicUser } from '../views.js';

const app = new Hono<Env>();

// Guards against two requests racing to claim a brand-new instance. needsSetup()
// only flips once the owner row is committed, so without this both could pass the
// check. Node is single-threaded, so a plain flag is enough.
let claiming = false;

/** Claim a fresh instance: name the community and create the owner account.
 *  Open only while the database has no users — the moment an owner exists this
 *  returns 409 forever. That is the whole security model, so a public instance
 *  must be set up promptly after first boot. */
app.post('/', async (c) => {
  if (claiming || !needsSetup()) return c.json({ error: 'this community is already set up' }, 409);

  const body = await c.req.json().catch(() => null);
  const communityName = String(body?.communityName ?? '').trim();
  const username = String(body?.username ?? '').trim().toLowerCase();
  const displayName = String(body?.displayName ?? '').trim() || username;
  const password = String(body?.password ?? '');

  if (!communityName) return c.json({ error: 'community name required' }, 400);
  if (!/^[a-z0-9_.-]{2,24}$/.test(username))
    return c.json({ error: 'username must be 2-24 chars: a-z 0-9 _ . -' }, 400);
  if (password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);

  claiming = true;
  try {
    const { owner, inviteCode } = seedCommunity({ communityName, username, displayName, password });
    const token = createSession(owner.id);
    return c.json({ token, user: toPublicUser(owner), inviteCode, communityName });
  } finally {
    claiming = false;
  }
});

export default app;
