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

/** The LiveKit voice session. One call at a time, independent of which text
 *  channel you're reading. */
class VoiceStore {
  channelId = $state<string | null>(null);
  channelName = $state("");
  status = $state<VoiceStatus>(VoiceStatus.Idle);
  participants = $state<VoiceParticipant[]>([]);
  micStatus = $state<MicStatus>(MicStatus.Muted);
  canPublish = $state(true);
  error = $state("");
  /** Available microphones. Labels only fill in once mic permission is granted,
   *  so this stays empty until then. */
  audioInputs = $state<MediaDeviceInfo[]>([]);
  /** deviceId of the mic currently in use. "default" follows the OS default. */
  audioInputId = $state("default");
  /** Whether incoming audio is silenced. Deafening also stops your own mic. */
  deafened = $state(false);
  /** Screen share tracks by publisher identity. A track only lands here once it
   *  is subscribed, so anything in here is watchable right now. */
  screens = $state<Record<string, Track>>({});
  /** Whose screen fills the chat pane, if any. */
  watching = $state<string | null>(null);
  /** Wanted to watch someone whose track has not been subscribed yet. */
  private pendingWatch = $state<string | null>(null);

  private room: Room | null = null;
  private audioEls = new Map<string, HTMLMediaElement>();
  /** Set while we tear down, to tell an intentional leave from a dropped call. */
  private leaving = false;
  /** True when deafening is what muted the mic, so undeafening can restore it. */
  private mutedByDeafen = false;

  get inCall(): boolean {
    return this.status !== VoiceStatus.Idle;
  }

  get isSharing(): boolean {
    const identity = this.room?.localParticipant.identity;
    return !!identity && !!this.screens[identity];
  }

  /** Whether the local mic is off for any reason - the boolean form of micStatus
   *  that the participant row and the presence broadcast both need. */
  get localMuted(): boolean {
    return this.micStatus !== MicStatus.Enabled;
  }

  async join(channel: { id: string; name: string }) {
    if (this.channelId === channel.id && this.inCall) return;
    if (this.room) await this.leave();

    this.status = VoiceStatus.Connecting;
    this.channelId = channel.id;
    this.channelName = channel.name;
    this.error = "";

    let url = "";
    try {
      const res = await api.voice.token(channel.id);
      url = res.url;
      this.canPublish = res.canPublish;
      // Show the intended state up front so the icon doesn't flash muted while
      // the mic comes up. Corrected below only if capture is refused.
      this.micStatus = res.canPublish ? MicStatus.Enabled : MicStatus.MutedByMod;

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      this.wire(room);

      await room.connect(url, res.token);
      this.status = VoiceStatus.Connected;
      realtime.send({ type: ClientEventType.Voice_Join, channelId: channel.id });
      playVoiceJoin();
      this.refresh();

      // A missing/denied mic must not drop the call: fall back to listen-only
      // (MicStatus.NotAllowed) and keep the connection.
      if (res.canPublish) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch (err) {
          this.micStatus =
            errorName(err) === "NotAllowedError" ? MicStatus.NotAllowed : MicStatus.Muted;
        }
      }
      // The mic has reached its final state - now safe to tell everyone else.
      this.announceMic();
      await room.startAudio().catch(() => {});
      this.loadDevices();
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
            el.muted = this.deafened;
            document.body.appendChild(el);
            this.audioEls.set(`${p.identity}:${track.sid}`, el);
          } else if (pub.source === Track.Source.ScreenShare) {
            this.screens = { ...this.screens, [p.identity]: track };
            // Clicking a stream from outside the channel joins first, so the
            // watch has to wait here for the track to actually arrive.
            if (this.pendingWatch === p.identity) {
              this.watching = p.identity;
              this.pendingWatch = null;
            }
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
          this.announceSharing(true);
        }
        this.refresh();
      })
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.ScreenShare) {
          this.dropScreen(room.localParticipant.identity);
          this.announceSharing(false);
        }
        this.refresh();
      })
      // A mic being plugged in/out, or LiveKit switching devices, both need the
      // list and the active id kept honest.
      .on(RoomEvent.MediaDevicesChanged, () => this.loadDevices())
      .on(RoomEvent.ActiveDeviceChanged, (kind, deviceId) => {
        if (kind === "audioinput") this.audioInputId = deviceId;
      })
      .on(RoomEvent.Disconnected, () => {
        const wasConnected = this.status === VoiceStatus.Connected;
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
        muted: this.localMuted,
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
  }

  /** Tell everyone else our mic state. Called only at real transitions, so there
   *  is nothing to dedup - the server ignores a no-op change anyway. */
  private announceMic() {
    realtime.send({ type: ClientEventType.Mic_Set, muted: this.localMuted });
  }

  private dropScreen(identity: string) {
    const next = { ...this.screens };
    delete next[identity];
    this.screens = next;
    if (this.watching === identity) this.watching = null;
  }

  private announceSharing(sharing: boolean) {
    realtime.send({ type: ClientEventType.Screen_Share_Set, sharing });
  }

  /** Join the channel if needed, then watch as soon as the track lands. The
   *  pending id is set after joining because join() resets this store. */
  async watch(channel: { id: string; name: string }, identity: string) {
    if (!this.screens[identity] && this.channelId !== channel.id) {
      await this.join(channel);
    }
    if (this.screens[identity]) this.watching = identity;
    else this.pendingWatch = identity;
  }

  stopWatching() {
    this.watching = null;
    this.pendingWatch = null;
  }

  async toggleScreenShare() {
    const lp = this.room?.localParticipant;
    if (!lp || !this.canPublish) return;
    try {
      await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: true });
    } catch (e) {
      if (errorName(e) !== "NotAllowedError")
        this.error = `Couldn't share your screen (${errorName(e)}).`;
    }
    this.refresh();
  }

  /** Refresh the mic list and which one is active. Cheap enough to call on any
   *  device change; labels stay blank until mic permission has been granted. */
  private async loadDevices() {
    try {
      this.audioInputs = await Room.getLocalDevices("audioinput");
      this.audioInputId = this.room?.getActiveDevice("audioinput") ?? "default";
    } catch {
      /* enumerateDevices can throw in locked-down contexts; leave the list as-is */
    }
  }

  /** Switch the microphone LiveKit captures from. Persists for the session so a
   *  later unmute keeps using it. */
  async setAudioInput(deviceId: string) {
    if (!this.room) return;
    try {
      await this.room.switchActiveDevice("audioinput", deviceId);
      this.audioInputId = deviceId;
    } catch (e) {
      this.error = `Couldn't switch microphone (${errorName(e)}).`;
    }
  }

  async toggleMic() {
    const enabling = this.micStatus !== MicStatus.Enabled;
    const changed = await this.applyMic(enabling);
    if (!changed) return;
    // Choosing to talk again cancels deafen - you can't hold a conversation with
    // people you've silenced. A plain unmute clears the deafen bookkeeping too.
    if (enabling && this.deafened) this.setDeafened(false);
    this.mutedByDeafen = false;
  }

  /** Drive the LiveKit mic and record the outcome. Returns whether the state
   *  actually moved, so callers know if a follow-up (sound, deafen) applies. */
  private async applyMic(enabling: boolean): Promise<boolean> {
    const lp = this.room?.localParticipant;
    if (!lp || !this.canPublish) return false;
    try {
      await lp.setMicrophoneEnabled(enabling);
    } catch (err) {
      // Turning the mic on can still be refused (permission revoked in the OS).
      if (errorName(err) === "NotAllowedError") {
        this.micStatus = MicStatus.NotAllowed;
        this.announceMic();
      }
      return false;
    }
    this.micStatus = enabling ? MicStatus.Enabled : MicStatus.Muted;
    this.announceMic();
    if (enabling) playUnmute();
    else playMute();
    this.refresh();
    return true;
  }

  /** Silence everyone else. Deafening also mutes your own mic (you can't talk to
   *  people you can't hear); undeafening restores the mic only if deafen is what
   *  muted it. */
  async toggleDeafen() {
    const next = !this.deafened;
    this.setDeafened(next);
    if (next) {
      if (this.micStatus === MicStatus.Enabled) {
        this.mutedByDeafen = await this.applyMic(false);
      }
    } else if (this.mutedByDeafen) {
      this.mutedByDeafen = false;
      if (this.micStatus === MicStatus.Muted) await this.applyMic(true);
    }
  }

  /** Apply the deafened flag to incoming audio and tell everyone else, so the
   *  channel shows it next to the mute icon. */
  private setDeafened(value: boolean) {
    if (this.deafened === value) return;
    this.deafened = value;
    for (const el of this.audioEls.values()) el.muted = value;
    realtime.send({ type: ClientEventType.Deafen_Set, deafened: value });
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
    this.pendingWatch = null;
    this.room = null;
    this.status = VoiceStatus.Idle;
    this.channelId = null;
    this.channelName = "";
    this.participants = [];
    this.micStatus = MicStatus.Muted;
    this.canPublish = true;
    this.audioInputs = [];
    this.audioInputId = "default";
    this.deafened = false;
    this.mutedByDeafen = false;
    this.leaving = false;
  }
}

export const voice = new VoiceStore();
