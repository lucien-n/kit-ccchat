import { ChannelType } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { AccessToken } from "livekit-server-sdk";
import { db } from "../../db/index.js";
import { channelsTable, type User } from "../../db/schema";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../../env.js";
import { httpError } from "../../http/errors.js";

/** The LiveKit room is the channel id, so joining a channel is joining its room. */
export async function issueVoiceToken(channelId: string, user: User) {
  const channel = db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .get();
  if (!channel || channel.type !== ChannelType.Voice)
    httpError(400, "not a voice channel");

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

  return { token: await at.toJwt(), room: channelId, canPublish };
}
