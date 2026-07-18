import { ChannelType, voiceTokenBody } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { AccessToken } from "livekit-server-sdk";
import { requireAuth, type Env } from "../auth.js";
import { db } from "../db/index.js";
import { channels } from "../db/schema";
import {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_PATH,
  LIVEKIT_URL,
} from "../env.js";
import { validate } from "../validate.js";

const app = new Hono<Env>();

app.use("*", requireAuth);

/** Derived from the request so the client reaches LiveKit through whatever proxy
 *  fronted us. Falling back to the raw Host header keeps `npm run dev` working,
 *  where there is no proxy to set X-Forwarded-Proto. */
function livekitUrl(c: Context): string {
  if (LIVEKIT_URL) return LIVEKIT_URL;

  const forwarded = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "localhost";
  const secure = forwarded
    ? forwarded === "https"
    : new URL(c.req.url).protocol === "https:";

  return `${secure ? "wss" : "ws"}://${host}${LIVEKIT_PATH}`;
}

app.get("/config", (c) => c.json({ url: livekitUrl(c) }));

/** The LiveKit room is the channel id, so joining a channel is joining its room. */
app.post("/token", validate("json", voiceTokenBody), async (c) => {
  const { channelId } = c.req.valid("json");

  const channel = db.select().from(channels).where(eq(channels.id, channelId)).get();
  if (!channel || channel.type !== ChannelType.Voice)
    return c.json({ error: "not a voice channel" }, 400);

  const user = c.get("user");
  const canPublish = !(user.mutedUntil && user.mutedUntil > Date.now());

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: user.id,
    name: user.displayName,
    ttl: "2h",
  });
  at.addGrant({
    room: channelId,
    roomJoin: true,
    canPublish,
    canPublishData: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return c.json({ token, url: livekitUrl(c), room: channelId, canPublish });
});

export default app;
