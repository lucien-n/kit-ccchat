import { ServerEventType, type ServerEvent, type VoiceMember } from "@motus/shared";
import type { WebSocket } from "ws";

interface Client {
  ws: WebSocket;
  userId: string;
}

/** In-memory fan-out hub. Fine for a single-machine instance at this scale;
 *  if you ever run multiple processes, this is where a Redis pub/sub goes. */
class Hub {
  private clients = new Set<Client>();
  /** channelId -> (userId -> member) for voice presence. */
  private voice = new Map<string, Map<string, VoiceMember>>();

  add(client: Client) {
    this.clients.add(client);
    this.broadcastPresence();
    this.send(client, this.voiceEvent());
  }

  remove(client: Client) {
    this.clients.delete(client);
    const stillConnected = [...this.clients].some((c) => c.userId === client.userId);
    if (!stillConnected) this.voiceLeaveAll(client.userId);
    this.broadcastPresence();
  }

  broadcast(event: ServerEvent) {
    const data = JSON.stringify(event);
    for (const c of this.clients) {
      if (c.ws.readyState === c.ws.OPEN) c.ws.send(data);
    }
  }

  send(client: Client, event: ServerEvent) {
    if (client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify(event));
    }
  }

  /** Deliver to every socket a user has open (they may be on more than one
   *  device). Returns whether any socket received it. */
  sendToUser(userId: string, event: ServerEvent): boolean {
    const data = JSON.stringify(event);
    let sent = false;
    for (const c of this.clients) {
      if (c.userId === userId && c.ws.readyState === c.ws.OPEN) {
        c.ws.send(data);
        sent = true;
      }
    }
    return sent;
  }

  isInVoice(userId: string): boolean {
    return this.voiceChannelOf(userId) !== null;
  }

  /** The voice channel (== LiveKit room) a user is in, or null. */
  voiceChannelOf(userId: string): string | null {
    for (const [channelId, members] of this.voice)
      if (members.has(userId)) return channelId;
    return null;
  }

  voiceMemberOf(userId: string): VoiceMember | null {
    for (const members of this.voice.values()) {
      const member = members.get(userId);
      if (member) return member;
    }
    return null;
  }

  // ── voice presence ─────────────────────────────────────────────────────────

  voiceJoin(channelId: string, member: VoiceMember) {
    // A user is only ever in one voice channel - clear any prior one first.
    this.removeFromVoice(member.id);
    let members = this.voice.get(channelId);
    if (!members) {
      members = new Map();
      this.voice.set(channelId, members);
    }
    members.set(member.id, member);
    this.broadcast(this.voiceEvent());
  }

  voiceLeaveAll(userId: string) {
    if (this.removeFromVoice(userId)) this.broadcast(this.voiceEvent());
  }

  setSharing(userId: string, sharing: boolean) {
    this.patchMember(userId, { sharing });
  }

  setCamera(userId: string, camera: boolean) {
    this.patchMember(userId, { camera });
  }

  setMuted(userId: string, muted: boolean) {
    this.patchMember(userId, { muted });
  }

  /** Moderator silence overlay, kept apart from self-mute so the member's own
   *  mic toggle can't clear it. No-op if they aren't in a call. */
  setForceMuted(userId: string, forceMuted: boolean) {
    this.patchMember(userId, { forceMuted });
  }

  setDeafened(userId: string, deafened: boolean) {
    this.patchMember(userId, { deafened });
  }

  /** Patch a voice member and rebroadcast if anything changed. Both mic and
   *  screen-share state live here so everyone sees them, including people who
   *  never joined the channel. */
  private patchMember(userId: string, patch: Partial<VoiceMember>) {
    for (const members of this.voice.values()) {
      const member = members.get(userId);
      if (!member) continue;
      const keys = Object.keys(patch) as (keyof VoiceMember)[];
      if (keys.every((k) => member[k] === patch[k])) return;
      members.set(userId, { ...member, ...patch });
      this.broadcast(this.voiceEvent());
      return;
    }
  }

  private removeFromVoice(userId: string): boolean {
    let changed = false;
    for (const [channelId, members] of this.voice) {
      if (members.delete(userId)) {
        changed = true;
        if (members.size === 0) this.voice.delete(channelId);
      }
    }
    return changed;
  }

  private voiceEvent(): ServerEvent {
    const presence: Record<string, VoiceMember[]> = {};
    for (const [channelId, members] of this.voice)
      presence[channelId] = [...members.values()];
    return { type: ServerEventType.Voice_Presence, presence };
  }

  private broadcastPresence() {
    const online = [...new Set([...this.clients].map((c) => c.userId))];
    this.broadcast({ type: ServerEventType.Presence, online });
  }
}

export const hub = new Hub();
export type { Client };
