import type { Room, Track } from "livekit-client";

export interface VoiceParticipant {
  identity: string;
  name: string;
  speaking: boolean;
  muted: boolean;
  sharing: boolean;
  camera: boolean;
  isLocal: boolean;
}

interface LocalState {
  screens: Record<string, Track>;
  cameras: Record<string, Track>;
  localMuted: boolean;
  localSpeaking: boolean;
}

export function buildParticipants(room: Room, local: LocalState): VoiceParticipant[] {
  const speaking = new Set(room.activeSpeakers.map((p) => p.identity));
  const lp = room.localParticipant;
  const list: VoiceParticipant[] = [
    {
      identity: lp.identity,
      name: lp.name || "me",
      speaking: speaking.has(lp.identity) || local.localSpeaking,
      muted: local.localMuted,
      sharing: !!local.screens[lp.identity],
      camera: !!local.cameras[lp.identity],
      isLocal: true,
    },
  ];
  for (const p of room.remoteParticipants.values()) {
    list.push({
      identity: p.identity,
      name: p.name || p.identity,
      speaking: speaking.has(p.identity),
      muted: !p.isMicrophoneEnabled,
      sharing: !!local.screens[p.identity],
      camera: !!local.cameras[p.identity],
      isLocal: false,
    });
  }
  return list;
}
