import { api } from "$lib/api";
import { apiErrorMessage, errorName } from "$lib/forms";
import { playVoiceJoin, playVoiceLeave } from "$lib/notify";
import { realtime } from "$lib/stores/realtime.svelte";
import { ClientEventType } from "@ccchat/shared";
import { Room, RoomEvent } from "livekit-client";
import { AudioSink, type StreamAudio } from "./audio-sink";
import { MicStatus, VoiceStatus, type Channel, type VoiceCore } from "./context";
import { DeviceController } from "./devices.svelte";
import { MediaController } from "./media.svelte";
import { MicController } from "./mic.svelte";
import { buildParticipants, type VoiceParticipant } from "./participants";
import { SoundboardPlayer } from "./soundboard/soundboard-player";

export { MicStatus, VoiceStatus };
export type { VoiceParticipant };

export const VOICE_DRAG_MIME = "application/x-ccchat-voice-user";

class VoiceStore implements VoiceCore {
  channel = $state<Channel | null>(null);
  status = $state<VoiceStatus>(VoiceStatus.Idle);
  participants = $state<VoiceParticipant[]>([]);
  canPublish = $state(true);
  error = $state("");

  readonly audio = new AudioSink();

  private roomRef: Room | null = null;
  private soundboard = new SoundboardPlayer();
  private playingSounds = 0;
  private leaving = false;

  private micCtl = new MicController(this);
  private mediaCtl = new MediaController(this);
  private deviceCtl = new DeviceController(this);

  get room(): Room | null {
    return this.roomRef;
  }
  get inCall(): boolean {
    return this.status !== VoiceStatus.Idle;
  }
  get deafened(): boolean {
    return this.micCtl.deafened;
  }
  get streamAudio(): Record<string, StreamAudio> {
    return this.mediaCtl.share.audio;
  }

  get micStatus(): MicStatus {
    return this.micCtl.status;
  }
  get localMuted(): boolean {
    return this.micCtl.localMuted;
  }
  get devices() {
    return this.deviceCtl.state;
  }
  get share() {
    return this.mediaCtl.share;
  }
  get spotlight() {
    return this.mediaCtl.spotlight;
  }
  get isScreenSharing(): boolean {
    return this.mediaCtl.isScreenSharing;
  }
  get isCameraOn(): boolean {
    return this.mediaCtl.isCameraOn;
  }

  loadDevices() {
    return this.deviceCtl.load();
  }
  setAudioInput(deviceId: string) {
    return this.deviceCtl.setInput(deviceId);
  }
  setAudioOutput(deviceId: string) {
    return this.deviceCtl.setOutput(deviceId);
  }
  toggleMic() {
    return this.micCtl.toggle();
  }
  toggleDeafen() {
    return this.micCtl.toggleDeafen();
  }
  applyModMute(forceMuted: boolean) {
    return this.micCtl.applyModMute(forceMuted);
  }
  toggleScreenShare() {
    return this.mediaCtl.toggleScreenShare();
  }
  toggleCamera() {
    return this.mediaCtl.toggleCamera();
  }
  watch(target: Channel, identity: string) {
    return this.mediaCtl.watch(target, identity);
  }
  stopWatching() {
    this.mediaCtl.stopWatching();
  }
  setStreamVolume(identity: string, volume: number) {
    this.mediaCtl.setStreamVolume(identity, volume);
  }
  toggleStreamMute(identity: string) {
    this.mediaCtl.toggleStreamMute(identity);
  }

  async join(target: Channel) {
    if (this.channel?.id === target.id && this.inCall) return;

    // Keep the bar up while switching: show the new channel, tear the old room
    // down quietly, so status never drops to Idle between the two calls.
    const previous = this.roomRef;
    this.roomRef = null;

    this.status = VoiceStatus.Connecting;
    this.channel = { id: target.id, name: target.name };
    this.error = "";

    if (previous) await this.teardownRoom(previous);

    let url = "";
    try {
      const res = await api.voice.token(target.id);
      url = res.url;
      this.canPublish = res.canPublish;
      this.micCtl.initForCall(res.canPublish);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { deviceId: this.deviceCtl.state.inputId },
        audioOutput: { deviceId: this.deviceCtl.state.outputId },
      });
      this.roomRef = room;
      this.wire(room);

      await room.connect(url, res.token);
      this.status = VoiceStatus.Connected;
      realtime.send({ type: ClientEventType.Voice_Join, channelId: target.id });
      playVoiceJoin();
      this.refresh();

      if (res.canPublish) await this.micCtl.engage();
      this.micCtl.announce();
      this.micCtl.announceDeafen();
      await room.startAudio().catch(() => {});
      this.deviceCtl.load();
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
      .on(RoomEvent.TrackMuted, (pub, p) => this.mediaCtl.onCameraMuteChanged(pub, p))
      .on(RoomEvent.TrackUnmuted, (pub, p) => this.mediaCtl.onCameraMuteChanged(pub, p))
      .on(RoomEvent.TrackSubscribed, (track, pub, p) =>
        this.mediaCtl.onTrackSubscribed(track, pub, p),
      )
      .on(RoomEvent.TrackUnsubscribed, (track, pub, p) =>
        this.mediaCtl.onTrackUnsubscribed(track, pub, p),
      )
      .on(RoomEvent.LocalTrackPublished, (pub) =>
        this.mediaCtl.onLocalTrackPublished(pub, room),
      )
      .on(RoomEvent.LocalTrackUnpublished, (pub) =>
        this.mediaCtl.onLocalTrackUnpublished(pub, room),
      )
      .on(RoomEvent.MediaDevicesChanged, () => this.deviceCtl.load())
      .on(RoomEvent.ActiveDeviceChanged, (kind, id) =>
        this.deviceCtl.onActiveDeviceChanged(kind, id),
      )
      .on(RoomEvent.Disconnected, () => this.onDisconnected(room));
  }

  private onDisconnected(room: Room) {
    // Ignore Disconnected from a room we already swapped away from on a channel
    // switch, so it can't reset the call we're now joining.
    if (this.roomRef !== room) return;
    const wasConnected = this.status === VoiceStatus.Connected;
    if (!this.leaving && wasConnected) {
      this.error = "Voice disconnected - the media connection dropped.";
    }
    if (wasConnected) {
      playVoiceLeave();
      realtime.send({ type: ClientEventType.Voice_Leave });
    }
    this.reset();
  }

  refresh() {
    this.participants = this.roomRef
      ? buildParticipants(this.roomRef, {
          screens: this.mediaCtl.share.screens,
          cameras: this.mediaCtl.share.cameras,
          localMuted: this.micCtl.localMuted,
          localSpeaking: this.playingSounds > 0,
        })
      : [];
  }

  async playSound(url: string) {
    const lp = this.roomRef?.localParticipant;
    if (!lp) return;
    const broadcast = !this.micCtl.localMuted && this.canPublish;
    try {
      await this.soundboard.play(lp, url, broadcast, (delta) => {
        // LiveKit's speaker detection watches the mic, not this clip, so light
        // the speaking ring by hand while it plays.
        this.playingSounds = Math.max(0, this.playingSounds + delta);
        this.refresh();
      });
    } catch (e) {
      this.error = `Couldn't play that sound (${errorName(e)}).`;
    }
  }

  moveMember(userId: string, channelId: string) {
    realtime.send({ type: ClientEventType.Voice_Move, userId, channelId });
  }

  private async teardownRoom(room: Room) {
    try {
      await room.disconnect();
    } catch {
      // ignore
    }
    this.audio.clear();
    this.micCtl.resetKeepingStatus();
    this.mediaCtl.reset();
    this.playingSounds = 0;
  }

  async leave() {
    this.leaving = true;
    try {
      await this.roomRef?.disconnect();
    } catch {
      // ignore
    }
    this.reset();
  }

  private reset() {
    this.audio.clear();
    this.micCtl.reset();
    this.mediaCtl.reset();
    this.roomRef = null;
    this.status = VoiceStatus.Idle;
    this.channel = null;
    this.participants = [];
    this.canPublish = true;
    this.playingSounds = 0;
    this.leaving = false;
  }
}

export const voice = new VoiceStore();
