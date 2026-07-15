import type { WebSocket } from 'ws';

/** A user currently connected to a voice channel. */
export interface VoiceMember {
  id: string;
  name: string;
  avatarVersion: number | null;
}

/** Events the server pushes down to clients over the WebSocket. */
export type ServerEvent =
  | { type: 'message.new'; message: unknown }
  | { type: 'message.deleted'; id: string; channelId: string }
  | { type: 'presence'; online: string[] }
  | { type: 'voice.presence'; presence: Record<string, VoiceMember[]> }
  | { type: 'community.renamed'; name: string }
  | { type: 'error'; message: string };

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
    // Bring the new client up to date on who's in each voice channel.
    this.send(client, this.voiceEvent());
  }

  remove(client: Client) {
    this.clients.delete(client);
    // If that was the user's last connection, drop them from voice too.
    const stillConnected = [...this.clients].some((c) => c.userId === client.userId);
    if (!stillConnected) this.voiceLeaveAll(client.userId);
    this.broadcastPresence();
  }

  /** Send an event to every connected client. */
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

  // ── voice presence ─────────────────────────────────────────────────────────

  voiceJoin(channelId: string, member: VoiceMember) {
    // A user is only ever in one voice channel — clear any prior one first.
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
    for (const [channelId, members] of this.voice) presence[channelId] = [...members.values()];
    return { type: 'voice.presence', presence };
  }

  private broadcastPresence() {
    const online = [...new Set([...this.clients].map((c) => c.userId))];
    this.broadcast({ type: 'presence', online });
  }
}

export const hub = new Hub();
export type { Client };
