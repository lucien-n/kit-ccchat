import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { AccessToken } from 'livekit-server-sdk';
import { db } from '../db/index.js';
import { channels } from '../db/schema.js';
import { requireAuth, type Env } from '../auth.js';
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from '../env.js';

const app = new Hono<Env>();

app.use('*', requireAuth);

/** Where the client should connect its LiveKit session. */
app.get('/config', (c) => c.json({ url: LIVEKIT_URL }));

/** Mint a short-lived LiveKit access token for a voice channel. The LiveKit
 *  "room" is simply the channel id, so joining a channel = joining its room.
 *  Moderation carries over: a muted member may listen but not publish. */
app.post('/token', async (c) => {
  const body = await c.req.json().catch(() => null);
  const channelId = String(body?.channelId ?? '');

  const channel = db.select().from(channels).where(eq(channels.id, channelId)).get();
  if (!channel || channel.type !== 'voice')
    return c.json({ error: 'not a voice channel' }, 400);

  const user = c.get('user');
  const canPublish = !(user.mutedUntil && user.mutedUntil > Date.now());

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: user.id,
    name: user.displayName,
    ttl: '2h',
  });
  at.addGrant({
    room: channelId,
    roomJoin: true,
    canPublish,
    canPublishData: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return c.json({ token, url: LIVEKIT_URL, room: channelId, canPublish });
});

export default app;
