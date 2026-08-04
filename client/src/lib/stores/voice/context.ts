import type { Room } from "livekit-client";
import type { AudioSink, StreamAudio } from "./audio-sink";
import type { VoiceParticipant } from "./participants";

export enum VoiceStatus {
  Idle = "Idle",
  Connecting = "Connecting",
  Connected = "Connected",
}

export enum MicStatus {
  Enabled = "Enabled",
  Muted = "Muted",
  MutedByMod = "MutedByMod",
  NotAllowed = "NotAllowed",
}

export interface Channel {
  id: string;
  name: string;
}

export interface VoiceCore {
  readonly room: Room | null;
  readonly channel: Channel | null;
  readonly inCall: boolean;
  readonly liveCues: boolean;
  canPublish: boolean;
  error: string;
  readonly deafened: boolean;
  readonly audio: AudioSink;
  readonly participants: VoiceParticipant[];
  readonly streamAudio: Record<string, StreamAudio>;
  refresh(): void;
  join(target: Channel): Promise<void>;
}
