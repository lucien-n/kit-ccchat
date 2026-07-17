import { ClientEvenType } from "@ccchat/shared";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import { api } from "../api";
import { apiErrorMessage, errorName } from "../forms";
import { playMute, playUnmute, playVoiceJoin, playVoiceLeave } from "../notify";
import { realtime } from "./realtime.svelte";

export interface VoiceParticipant {
  identity: string;
  name: string;
  speaking: boolean;
  muted: boolean;
  isLocal: boolean;
}

type Status = "idle" | "connecting" | "connected";

/** Manages the LiveKit voice session. One call at a time (like Discord: you're
 *  in exactly one voice channel), independent of which text channel you're
 *  reading. Uses an SFU so it scales past mesh's ~5-user ceiling to 20+. */
class VoiceStore {
  channelId = $state<string | null>(null);
  channelName = $state("");
  status = $state<Status>("idle");
  participants = $state<VoiceParticipant[]>([]);
  micMuted = $state(false);
  canPublish = $state(true);
  /** Hard failure that prevented joining (shown as a banner). */
  error = $state("");
  /** Soft notice - connected, but mic couldn't be captured (listen-only). */
  micError = $state("");

  private room: Room | null = null;
  private audioEls = new Map<string, HTMLMediaElement>();
  /** True while WE are tearing down, to tell an intentional leave apart from an
   *  unexpected drop (e.g. media connection failure). */
  private leaving = false;

  get inCall(): boolean {
    return this.status !== "idle";
  }

  async join(channel: { id: string; name: string }, authToken: string) {
    if (this.channelId === channel.id && this.inCall) return;
    if (this.room) await this.leave();

    this.status = "connecting";
    this.channelId = channel.id;
    this.channelName = channel.name;
    this.error = "";
    this.micError = "";

    let url = "";
    try {
      const res = await api.voiceToken(authToken, channel.id);
      url = res.url;
      this.canPublish = res.canPublish;

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      this.wire(room);

      // If the SFU is unreachable - or its advertised media address isn't
      // reachable by this browser - this is what fails.
      await room.connect(url, res.token);
      this.status = "connected";
      realtime.send({ type: ClientEvenType.Voice_Join, channelId: channel.id });
      playVoiceJoin();
      this.refresh();

      // A missing/denied microphone must NOT drop the call: you can still
      // listen. Surface it as a soft notice instead of tearing down.
      if (res.canPublish) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch (e) {
          this.micError = `Microphone unavailable (${errorName(e)}) - you're listening only.`;
        }
      }
      await room.startAudio().catch(() => {});
      this.refresh();
    } catch (e) {
      console.error("[voice] failed to connect", { url, error: e });
      this.error = `Couldn't connect to voice${url ? ` (${url})` : ""}: ${apiErrorMessage(e, String(e))}`;
      await this.leave();
    }
  }

  private wire(room: Room) {
    const rerender = () => this.refresh();
    room
      .on(RoomEvent.ParticipantConnected, rerender)
      .on(RoomEvent.ParticipantDisconnected, rerender)
      .on(RoomEvent.ActiveSpeakersChanged, rerender)
      .on(RoomEvent.TrackMuted, rerender)
      .on(RoomEvent.TrackUnmuted, rerender)
      .on(RoomEvent.LocalTrackPublished, rerender)
      .on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, _pub: RemoteTrackPublication, p: Participant) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.style.display = "none";
            document.body.appendChild(el);
            this.audioEls.set(`${p.identity}:${track.sid}`, el);
          }
          this.refresh();
        },
      )
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub, p: Participant) => {
        track.detach().forEach((el) => el.remove());
        this.audioEls.delete(`${p.identity}:${track.sid}`);
        this.refresh();
      })
      .on(RoomEvent.Disconnected, () => {
        const wasConnected = this.status === "connected";
        // If we didn't ask to leave, the media connection dropped on its own.
        if (!this.leaving && wasConnected) {
          this.error =
            "Voice disconnected - the media connection dropped. If the server is " +
            "in Docker Desktop on Windows/macOS, WebRTC UDP is blocked there; run " +
            "it on a Linux host (see README).";
        }
        if (wasConnected) {
          playVoiceLeave();
          realtime.send({ type: ClientEvenType.Voice_Leave });
        }
        this.reset();
      });
  }

  private refresh() {
    const room = this.room;
    if (!room) {
      this.participants = [];
      return;
    }
    const speaking = new Set(room.activeSpeakers.map((p) => p.identity));
    const lp = room.localParticipant;
    const list: VoiceParticipant[] = [
      {
        identity: lp.identity,
        name: lp.name || "me",
        speaking: speaking.has(lp.identity),
        muted: !lp.isMicrophoneEnabled,
        isLocal: true,
      },
    ];
    for (const p of room.remoteParticipants.values()) {
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        speaking: speaking.has(p.identity),
        muted: !p.isMicrophoneEnabled,
        isLocal: false,
      });
    }
    this.participants = list;
    this.micMuted = !lp.isMicrophoneEnabled;
  }

  async toggleMic() {
    const lp = this.room?.localParticipant;
    if (!lp || !this.canPublish) return;
    await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled);
    if (lp.isMicrophoneEnabled) playUnmute();
    else playMute();
    this.refresh();
  }

  async leave() {
    this.leaving = true;
    try {
      await this.room?.disconnect();
    } catch {
      /* ignore */
    }
    this.reset();
  }

  private reset() {
    for (const el of this.audioEls.values()) el.remove();
    this.audioEls.clear();
    this.room = null;
    this.status = "idle";
    this.channelId = null;
    this.channelName = "";
    this.participants = [];
    this.micMuted = false;
    this.canPublish = true;
    this.micError = "";
    this.leaving = false;
  }
}

export const voice = new VoiceStore();
