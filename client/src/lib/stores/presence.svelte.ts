import type { VoiceMember } from "../api";

/** Who is online and who is in which voice channel. Entirely server-pushed:
 *  nothing here is ever set locally, it is replaced wholesale by each event. */
class Presence {
  online = $state<Set<string>>(new Set());
  voice = $state<Record<string, VoiceMember[]>>({});

  setOnline(ids: string[]) {
    this.online = new Set(ids);
  }

  isOnline(id: string) {
    return this.online.has(id);
  }

  setVoice(presence: Record<string, VoiceMember[]>) {
    this.voice = presence ?? {};
  }

  clear() {
    this.online = new Set();
    this.voice = {};
  }
}

export const presence = new Presence();
