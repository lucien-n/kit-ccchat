import { ChannelType } from "@motus/shared";
import { AccessToken, RoomServiceClient, TrackType } from "livekit-server-sdk";
import { findById } from "../../db/query.js";
import { channelsTable, type User } from "../../db/schema";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../env.js";
import { httpError } from "../../http/errors.js";

/** The LiveKit room is the channel id, so joining a channel is joining its room. */
export async function issueVoiceToken(channelId: string, user: User) {
  const channel = findById(channelsTable, channelId);
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

let roomService: RoomServiceClient | null = null;
function livekitRooms(): RoomServiceClient {
  roomService ??= new RoomServiceClient(
    LIVEKIT_HOST,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );
  return roomService;
}

/** Mute (or restore) every audio track a member is publishing in a room, so a
 *  moderator's mute takes hold on the wire immediately rather than at the next
 *  reconnect. Best-effort: the DB mute is the source of truth, so a LiveKit
 *  outage or a member who isn't actually in the room must not fail the action. */
export async function setMemberAudioMuted(room: string, userId: string, muted: boolean) {
  const svc = livekitRooms();
  const participant = await svc.getParticipant(room, userId).catch(() => null);
  if (!participant) return;

  await Promise.all(
    participant.tracks
      .filter((t) => t.type === TrackType.AUDIO && t.muted !== muted)
      .map((t) => svc.mutePublishedTrack(room, userId, t.sid, muted)),
  );
}
