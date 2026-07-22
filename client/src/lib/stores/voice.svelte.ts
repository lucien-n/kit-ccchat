import { ClientEventType } from "@ccchat/shared";
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
  sharing: boolean;
  isLocal: boolean;
}

type Status = "idle" | "connecting" | "connected";

/** The LiveKit voice session. One call at a time, independent of which text
 *  channel you're reading. */
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
  /** Screen share tracks by publisher identity. A track only lands here once it
   *  is subscribed, so anything in here is watchable right now. */
  screens = $state<Record<string, Track>>({});
  /** Whose screen fills the chat pane, if any. */
  watching = $state<string | null>(null);

  private room: Room | null = null;
  private audioEls = new Map<string, HTMLMediaElement>();
  /** Set while we tear down, to tell an intentional leave from a dropped call. */
  private leaving = false;

  get inCall(): boolean {
    return this.status !== "idle";
  }

  get isSharing(): boolean {
    const identity = this.room?.localParticipant.identity;
    return !!identity && !!this.screens[identity];
  }

  async join(channel: { id: string; name: string }) {
    if (this.channelId === channel.id && this.inCall) return;
    if (this.room) await this.leave();

    this.status = "connecting";
    this.channelId = channel.id;
    this.channelName = channel.name;
    this.error = "";
    this.micError = "";

    let url = "";
    try {
      const res = await api.voice.token(channel.id);
      url = res.url;
      this.canPublish = res.canPublish;

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      this.wire(room);

      await room.connect(url, res.token);
      this.status = "connected";
      realtime.send({ type: ClientEventType.Voice_Join, channelId: channel.id });
      playVoiceJoin();
      this.refresh();

      // A missing/denied mic must not drop the call: surface it as a soft notice
      // and keep listening.
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
      .on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, pub: RemoteTrackPublication, p: Participant) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.style.display = "none";
            document.body.appendChild(el);
            this.audioEls.set(`${p.identity}:${track.sid}`, el);
          } else if (pub.source === Track.Source.ScreenShare) {
            this.screens = { ...this.screens, [p.identity]: track };
          }
          this.refresh();
        },
      )
      .on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack, pub: RemoteTrackPublication, p: Participant) => {
          track.detach().forEach((el) => el.remove());
          this.audioEls.delete(`${p.identity}:${track.sid}`);
          if (pub.source === Track.Source.ScreenShare) this.dropScreen(p.identity);
          this.refresh();
        },
      )
      // The browser's own "Stop sharing" bar never touches our button, so the
      // publish events are the only honest signal for the local screen.
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.ScreenShare && pub.track) {
          this.screens = {
            ...this.screens,
            [room.localParticipant.identity]: pub.track,
          };
        }
        this.refresh();
      })
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.ScreenShare)
          this.dropScreen(room.localParticipant.identity);
        this.refresh();
      })
      .on(RoomEvent.Disconnected, () => {
        const wasConnected = this.status === "connected";
        if (!this.leaving && wasConnected) {
          this.error =
            "Voice disconnected - the media connection dropped. If the server is " +
            "in Docker Desktop on Windows/macOS, WebRTC UDP is blocked there; run " +
            "it on a Linux host (see README).";
        }
        if (wasConnected) {
          playVoiceLeave();
          realtime.send({ type: ClientEventType.Voice_Leave });
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
        sharing: !!this.screens[lp.identity],
        isLocal: true,
      },
    ];
    for (const p of room.remoteParticipants.values()) {
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        speaking: speaking.has(p.identity),
        muted: !p.isMicrophoneEnabled,
        sharing: !!this.screens[p.identity],
        isLocal: false,
      });
    }
    this.participants = list;
    this.micMuted = !lp.isMicrophoneEnabled;
  }

  private dropScreen(identity: string) {
    const next = { ...this.screens };
    delete next[identity];
    this.screens = next;
    if (this.watching === identity) this.watching = null;
  }

  watch(identity: string) {
    if (this.screens[identity]) this.watching = identity;
  }

  stopWatching() {
    this.watching = null;
  }

  async toggleScreenShare() {
    const lp = this.room?.localParticipant;
    if (!lp || !this.canPublish) return;
    try {
      await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: true });
    } catch (e) {
      // Dismissing the picker is a decision, not a fault.
      if (errorName(e) !== "NotAllowedError")
        this.error = `Couldn't share your screen (${errorName(e)}).`;
    }
    this.refresh();
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
    this.screens = {};
    this.watching = null;
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
