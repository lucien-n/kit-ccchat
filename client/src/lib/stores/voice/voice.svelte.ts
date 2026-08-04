import { api } from "$lib/api";
import { apiErrorMessage, errorName } from "$lib/forms";
import { playMute, playUnmute, playVoiceJoin, playVoiceLeave } from "$lib/notify";
import { realtime } from "$lib/stores/realtime.svelte";
import { ClientEventType } from "@ccchat/shared";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type TrackPublication,
} from "livekit-client";
import { buildParticipants, type VoiceParticipant } from "./participants";
import { SoundboardPlayer } from "./soundboard-player";

export type { VoiceParticipant };

/** dataTransfer key carrying the dragged member's id when moving someone
 *  between voice channels; the value is only readable on drop, not dragover. */
export const VOICE_DRAG_MIME = "application/x-ccchat-voice-user";

/** Whether the browser can route audio to a chosen speaker. False on Firefox
 *  and iOS Safari, where enumerating and switching outputs is pointless. */
const supportsAudioOutput = () =>
  typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

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

interface Channel {
  id: string;
  name: string;
}

/** The LiveKit voice session. One call at a time, independent of which text
 *  channel you're reading. */
class VoiceStore {
  /** The channel this call is in, or null when idle. */
  channel = $state<Channel | null>(null);
  status = $state<VoiceStatus>(VoiceStatus.Idle);
  participants = $state<VoiceParticipant[]>([]);
  micStatus = $state<MicStatus>(MicStatus.Muted);
  canPublish = $state(true);
  error = $state("");
  /** Whether incoming audio is silenced. Deafening also stops your own mic. */
  deafened = $state(false);
  isCameraOn = $state(false);
  isScreenSharing = $state(false);

  devices = $state({
    inputs: [] as MediaDeviceInfo[],
    inputId: "default",
    outputs: [] as MediaDeviceInfo[],
    outputId: "default",
  });

  share = $state({
    screens: {} as Record<string, Track>,
    cameras: {} as Record<string, Track>,
    watching: null as string | null,
    audio: {} as Record<string, { volume: number; muted: boolean }>,
  });

  /** Wanted to watch someone whose track has not been subscribed yet. */
  private pendingWatch: string | null = null;

  private room: Room | null = null;
  private audioEls = new Map<string, HTMLMediaElement>();
  /** The audio element carrying each stream's screen-share sound, so per-stream
   *  volume changes can be applied to it. Keys mirror `share.audio`. */
  private screenAudioEls = new Map<string, HTMLMediaElement>();
  private soundboard = new SoundboardPlayer();
  /** Clips publishing right now; drives the local speaking ring that LiveKit's
   *  mic detection won't light. Only read from refresh(), so a plain field. */
  private playingSounds = 0;
  /** Set while we tear down, to tell an intentional leave from a dropped call. */
  private leaving = false;
  /** True when deafening is what muted the mic, so undeafening can restore it. */
  private mutedByDeafen = false;
  /** True while a moderator mute is holding our mic down. LiveKit lets the server
   *  silence our track but not turn it back on, so the client re-enables the mic
   *  itself when the mute lifts. */
  private mutedByMod = false;
  /** Whether we were self-muted when a mod mute landed, so lifting it returns us
   *  there instead of unmuting someone who wanted to stay quiet. */
  private selfMutedBeforeMod = false;
  /** Last camera on/off state we told the server, so publish, unpublish and mute
   *  events don't re-announce a value that hasn't moved. */
  private cameraAnnounced = false;

  get inCall(): boolean {
    return this.status !== VoiceStatus.Idle;
  }

  /** The one video the floating window shows while you're away from the room:
   *  the stream you're watching wins, otherwise the loudest camera in the call,
   *  falling back to any camera that's on so a face is still visible in a lull. */
  get spotlight(): {
    identity: string;
    name: string;
    track: Track;
    kind: "screen" | "camera";
  } | null {
    const named = (id: string) =>
      this.participants.find((p) => p.identity === id)?.name ?? "someone";

    const w = this.share.watching;
    if (w && this.share.screens[w])
      return {
        identity: w,
        name: named(w),
        track: this.share.screens[w],
        kind: "screen",
      };

    const cams = this.share.cameras;
    const cam = (id: string) =>
      ({ identity: id, name: named(id), track: cams[id], kind: "camera" }) as const;

    const speaking = this.participants.find((p) => p.speaking && cams[p.identity]);
    if (speaking) return cam(speaking.identity);

    const remote = this.participants.find((p) => !p.isLocal && cams[p.identity]);
    if (remote) return cam(remote.identity);

    const anyId = Object.keys(cams)[0];
    return anyId ? cam(anyId) : null;
  }

  /** Whether the local mic is off for any reason - the boolean form of micStatus
   *  that the participant row and the presence broadcast both need. */
  get localMuted(): boolean {
    return this.micStatus !== MicStatus.Enabled;
  }

  async join(target: Channel) {
    if (this.channel?.id === target.id && this.inCall) return;

    // Switching straight from another channel keeps the bar up: show the new
    // channel now and tear the old room down quietly, so status never drops to
    // Idle (which unmounts the bar and plays its fly-out) between the two calls.
    const previous = this.room;
    this.room = null;

    this.status = VoiceStatus.Connecting;
    this.channel = { id: target.id, name: target.name };
    this.error = "";

    if (previous) await this.teardownRoom(previous);

    let url = "";
    try {
      const res = await api.voice.token(target.id);
      url = res.url;
      this.canPublish = res.canPublish;
      // Joining while already mod-muted means the mute is holding the mic down,
      // so a later unmute has to know to restore it.
      this.mutedByMod = !res.canPublish;
      // Show the intended state up front so the icon doesn't flash muted while
      // the mic comes up. Corrected below only if capture is refused.
      this.micStatus = res.canPublish ? MicStatus.Enabled : MicStatus.MutedByMod;

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      this.wire(room);

      await room.connect(url, res.token);
      this.status = VoiceStatus.Connected;
      realtime.send({ type: ClientEventType.Voice_Join, channelId: target.id });
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
      // Disabling a camera mutes its track rather than unpublishing it, so the
      // mute events - not publish/unpublish - are what turn a webcam tile back
      // into an avatar and clear the sharer's camera flag.
      .on(RoomEvent.TrackMuted, (pub, p) => this.onCameraMaybeChanged(pub, p))
      .on(RoomEvent.TrackUnmuted, (pub, p) => this.onCameraMaybeChanged(pub, p))
      .on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, pub: RemoteTrackPublication, p: Participant) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.style.display = "none";
            el.muted = this.deafened;
            document.body.appendChild(el);
            this.audioEls.set(`${p.identity}:${track.sid}`, el);
            // A stream's sound is its own track, so it gets its own volume knob
            // in the watch view rather than riding the global deafen alone.
            if (pub.source === Track.Source.ScreenShareAudio) {
              this.screenAudioEls.set(p.identity, el);
              this.share.audio = {
                ...this.share.audio,
                [p.identity]: { volume: 1, muted: false },
              };
              this.applyStreamAudio(p.identity);
            }
          } else if (pub.source === Track.Source.ScreenShare) {
            this.share.screens = { ...this.share.screens, [p.identity]: track };
            // Clicking a stream from outside the channel joins first, so the
            // watch has to wait here for the track to actually arrive.
            if (this.pendingWatch === p.identity) {
              this.share.watching = p.identity;
              this.pendingWatch = null;
            }
          } else if (pub.source === Track.Source.Camera) {
            this.syncRemoteCamera(p.identity, pub);
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
          if (pub.source === Track.Source.ScreenShareAudio)
            this.dropScreenAudio(p.identity);
          if (pub.source === Track.Source.Camera) this.dropCamera(p.identity);
          this.refresh();
        },
      )
      // The browser's own "Stop sharing" bar never touches our button, so the
      // publish events are the only honest signal for the local screen.
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        const identity = room.localParticipant.identity;
        if (pub.source === Track.Source.ScreenShare && pub.track) {
          this.share.screens = { ...this.share.screens, [identity]: pub.track };
          this.announceSharing(true);
        } else if (pub.source === Track.Source.Camera) {
          this.syncLocalCamera();
        }
        this.refresh();
      })
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        const identity = room.localParticipant.identity;
        if (pub.source === Track.Source.ScreenShare) {
          this.dropScreen(identity);
          this.announceSharing(false);
        } else if (pub.source === Track.Source.Camera) {
          this.syncLocalCamera();
        }
        this.refresh();
      })
      // A mic being plugged in/out, or LiveKit switching devices, both need the
      // list and the active id kept honest.
      .on(RoomEvent.MediaDevicesChanged, () => this.loadDevices())
      .on(RoomEvent.ActiveDeviceChanged, (kind, deviceId) => {
        if (kind === "audioinput") this.devices.inputId = deviceId;
        else if (kind === "audiooutput") this.devices.outputId = deviceId;
      })
      .on(RoomEvent.Disconnected, () => {
        // A room we've already swapped away from (channel switch) tears itself
        // down through teardownRoom; ignore its Disconnected so it can't reset
        // the call we're now joining.
        if (this.room !== room) return;
        const wasConnected = this.status === VoiceStatus.Connected;
        if (!this.leaving && wasConnected) {
          this.error = "Voice disconnected - the media connection dropped.";
        }
        if (wasConnected) {
          playVoiceLeave();
          realtime.send({ type: ClientEventType.Voice_Leave });
        }
        this.reset();
      });
  }

  private refresh() {
    this.participants = this.room
      ? buildParticipants(this.room, {
          screens: this.share.screens,
          cameras: this.share.cameras,
          localMuted: this.localMuted,
          localSpeaking: this.playingSounds > 0,
        })
      : [];
  }

  /** Tell everyone else our mic state. Called only at real transitions, so there
   *  is nothing to dedup - the server ignores a no-op change anyway. */
  private announceMic() {
    realtime.send({ type: ClientEventType.Mic_Set, muted: this.localMuted });
  }

  private dropScreen(identity: string) {
    const next = { ...this.share.screens };
    delete next[identity];
    this.share.screens = next;
    if (this.share.watching === identity) this.share.watching = null;
  }

  private dropCamera(identity: string) {
    const next = { ...this.share.cameras };
    delete next[identity];
    this.share.cameras = next;
  }

  private dropScreenAudio(identity: string) {
    this.screenAudioEls.delete(identity);
    const next = { ...this.share.audio };
    delete next[identity];
    this.share.audio = next;
  }

  /** Push a stream's stored volume/mute onto its audio element. Deafen still
   *  wins: it silences every stream regardless of the per-stream setting. */
  private applyStreamAudio(identity: string) {
    const element = this.screenAudioEls.get(identity);
    const settings = this.share.audio[identity];
    if (!element || !settings) return;
    element.volume = settings.volume;
    element.muted = this.deafened || settings.muted;
  }

  /** Set how loud a stream plays for you only, 0..1. Muting clears once you
   *  raise the volume off zero, matching how a slider is expected to behave. */
  setStreamVolume(identity: string, volume: number) {
    const settings = this.share.audio[identity];
    if (!settings) return;
    const clamped = Math.min(1, Math.max(0, volume));
    this.share.audio = {
      ...this.share.audio,
      [identity]: { volume: clamped, muted: clamped === 0 },
    };
    this.applyStreamAudio(identity);
  }

  toggleStreamMute(identity: string) {
    const settings = this.share.audio[identity];
    if (!settings) return;
    this.share.audio = {
      ...this.share.audio,
      [identity]: { ...settings, muted: !settings.muted },
    };
    this.applyStreamAudio(identity);
  }

  private announceSharing(sharing: boolean) {
    this.isScreenSharing = sharing;

    realtime.send({ type: ClientEventType.Screen_Share_Set, sharing });
  }

  private announceCamera(camera: boolean) {
    realtime.send({ type: ClientEventType.Camera_Set, camera });
  }

  /** Reconcile a camera after a mute/unmute. Turning a webcam off mutes its
   *  track (it stays published), so this is where a tile drops back to the
   *  avatar and the camera flag clears. */
  private onCameraMaybeChanged(pub: TrackPublication, p: Participant) {
    if (pub.source === Track.Source.Camera) {
      if (p.isLocal) this.syncLocalCamera();
      else this.syncRemoteCamera(p.identity, pub as RemoteTrackPublication);
    }
    this.refresh();
  }

  /** A remote camera counts as on only while it's subscribed and unmuted. */
  private syncRemoteCamera(identity: string, pub: RemoteTrackPublication) {
    if (pub.track && !pub.isMuted)
      this.share.cameras = { ...this.share.cameras, [identity]: pub.track };
    else this.dropCamera(identity);
  }

  /** Mirror our own camera into the shared map and tell everyone, keyed off
   *  isCameraEnabled (published and unmuted) so publish, unpublish and mute all
   *  resolve to one truth. Announces only on a real change. */
  private syncLocalCamera() {
    const lp = this.room?.localParticipant;
    if (!lp) return;

    const on = lp.isCameraEnabled;
    this.isCameraOn = on;

    const pub = lp.getTrackPublication(Track.Source.Camera);
    if (on && pub?.track)
      this.share.cameras = { ...this.share.cameras, [lp.identity]: pub.track };
    else this.dropCamera(lp.identity);

    if (on !== this.cameraAnnounced) {
      this.cameraAnnounced = on;
      this.announceCamera(on);
    }
  }

  /** Join the channel if needed, then watch as soon as the track lands. The
   *  pending id is set after joining because join() resets this store. */
  async watch(target: Channel, identity: string) {
    if (!this.share.screens[identity] && this.channel?.id !== target.id) {
      await this.join(target);
    }
    if (this.share.screens[identity]) this.share.watching = identity;
    else this.pendingWatch = identity;
  }

  stopWatching() {
    this.share.watching = null;
    this.pendingWatch = null;
  }

  /** Play a soundboard clip into the call. Muted means muted: a clip triggered
   *  while muted plays only for you. */
  async playSound(url: string) {
    const lp = this.room?.localParticipant;
    if (!lp) return;
    const broadcast = !this.localMuted && this.canPublish;
    try {
      await this.soundboard.play(lp, url, broadcast, (delta) => {
        // LiveKit's active-speaker detection watches the mic, not this track, so
        // light the speaking ring by hand while the clip is publishing.
        this.playingSounds = Math.max(0, this.playingSounds + delta);
        this.refresh();
      });
    } catch (e) {
      this.error = `Couldn't play that sound (${errorName(e)}).`;
    }
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

  async toggleCamera() {
    const lp = this.room?.localParticipant;
    if (!lp || !this.canPublish) return;
    try {
      await lp.setCameraEnabled(!lp.isCameraEnabled);
    } catch (e) {
      if (errorName(e) !== "NotAllowedError")
        this.error = `Couldn't turn on your camera (${errorName(e)}).`;
    }
    this.refresh();
  }

  /** Refresh the mic list and which one is active. Cheap enough to call on any
   *  device change; labels stay blank until mic permission has been granted. */
  private async loadDevices() {
    try {
      this.devices.inputs = await Room.getLocalDevices("audioinput");
      this.devices.inputId = this.room?.getActiveDevice("audioinput") ?? "default";
      // Output routing only exists where setSinkId does; elsewhere the list
      // stays empty so the speaker picker never offers a choice that can't work.
      if (supportsAudioOutput()) {
        this.devices.outputs = await Room.getLocalDevices("audiooutput");
        this.devices.outputId = this.room?.getActiveDevice("audiooutput") ?? "default";
      }
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
      this.devices.inputId = deviceId;
    } catch (e) {
      this.error = `Couldn't switch microphone (${errorName(e)}).`;
    }
  }

  /** Switch the speaker all incoming audio plays through. Applies setSinkId to
   *  every subscribed audio element under the hood. */
  async setAudioOutput(deviceId: string) {
    if (!this.room) return;
    try {
      await this.room.switchActiveDevice("audiooutput", deviceId);
      this.devices.outputId = deviceId;
    } catch (e) {
      this.error = `Couldn't switch speaker (${errorName(e)}).`;
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

  /** React to a moderator muting or unmuting us mid-call, driven by our own
   *  `forceMuted` flag in voice presence. LiveKit can silence our track from the
   *  server but can't turn it back on, so the client has to re-enable the mic
   *  itself when the mute lifts - otherwise the mic stays dead until a manual
   *  toggle. */
  async applyModMute(forceMuted: boolean) {
    if (!this.inCall || forceMuted === this.mutedByMod) return;
    const lp = this.room?.localParticipant;

    if (forceMuted) {
      this.mutedByMod = true;
      this.selfMutedBeforeMod = this.micStatus === MicStatus.Muted;
      this.canPublish = false;
      this.micStatus = MicStatus.MutedByMod;
      await lp?.setMicrophoneEnabled(false).catch(() => {});
      this.refresh();
      return;
    }

    this.mutedByMod = false;
    this.canPublish = true;
    // Return someone who was already self-muted to that state rather than opening
    // their mic for them; otherwise restore the mic the mute silenced.
    if (this.selfMutedBeforeMod) {
      this.micStatus = MicStatus.Muted;
      this.announceMic();
      this.refresh();
    } else {
      await this.applyMic(true);
    }
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
    // Stream audio lives in audioEls too, so undeafening just muted it blindly;
    // restore each stream's own volume/mute on top.
    for (const identity of this.screenAudioEls.keys()) this.applyStreamAudio(identity);
    realtime.send({ type: ClientEventType.Deafen_Set, deafened: value });
    this.refresh();
  }

  /** Force another member into a voice channel (moderator action). The server
   *  checks permission and tells their client to reconnect. */
  moveMember(userId: string, channelId: string) {
    realtime.send({ type: ClientEventType.Voice_Move, userId, channelId });
  }

  /** Disconnect a room we're switching away from and drop its media, without
   *  touching the visible status or channel - the bar stays up for the next
   *  call. The server clears our old voice presence when the new Voice_Join
   *  lands, so there's no leave to send from here. */
  private async teardownRoom(room: Room) {
    try {
      await room.disconnect();
    } catch {
      /* ignore */
    }
    for (const el of this.audioEls.values()) el.remove();
    this.audioEls.clear();
    this.screenAudioEls.clear();
    this.share = { screens: {}, cameras: {}, watching: null, audio: {} };
    this.pendingWatch = null;
    this.deafened = false;
    this.mutedByDeafen = false;
    this.mutedByMod = false;
    this.selfMutedBeforeMod = false;
    this.cameraAnnounced = false;
    this.isCameraOn = false;
    this.isScreenSharing = false;
    this.playingSounds = 0;
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
    this.screenAudioEls.clear();
    this.share = { screens: {}, cameras: {}, watching: null, audio: {} };
    this.pendingWatch = null;
    this.room = null;
    this.status = VoiceStatus.Idle;
    this.channel = null;
    this.participants = [];
    this.micStatus = MicStatus.Muted;
    this.canPublish = true;
    this.devices = { inputs: [], inputId: "default", outputs: [], outputId: "default" };
    this.deafened = false;
    this.mutedByDeafen = false;
    this.mutedByMod = false;
    this.selfMutedBeforeMod = false;
    this.cameraAnnounced = false;
    this.isCameraOn = false;
    this.isScreenSharing = false;
    this.playingSounds = 0;
    this.leaving = false;
  }
}

export const voice = new VoiceStore();
