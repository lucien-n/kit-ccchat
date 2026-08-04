import { errorName } from "$lib/forms";
import { realtime } from "$lib/stores/realtime.svelte";
import { ClientEventType } from "@ccchat/shared";
import {
  Track,
  type LocalTrackPublication,
  type Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type Room,
  type TrackPublication,
} from "livekit-client";
import type { Channel, VoiceCore } from "./context";

const emptyShare = () => ({
  screens: {} as Record<string, Track>,
  cameras: {} as Record<string, Track>,
  watching: null as string | null,
  audio: {} as Record<string, { volume: number; muted: boolean }>,
});

export class MediaController {
  share = $state(emptyShare());

  private pendingWatch: string | null = null;
  private cameraAnnounced = false;

  constructor(private core: VoiceCore) {}

  get isScreenSharing(): boolean {
    return this.core.participants.find((p) => p.isLocal)?.sharing ?? false;
  }

  get isCameraOn(): boolean {
    return this.core.participants.find((p) => p.isLocal)?.camera ?? false;
  }

  get spotlight(): {
    identity: string;
    name: string;
    track: Track;
    kind: "screen" | "camera";
  } | null {
    const named = (id: string) =>
      this.core.participants.find((p) => p.identity === id)?.name ?? "someone";

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

    const speaking = this.core.participants.find((p) => p.speaking && cams[p.identity]);
    if (speaking) return cam(speaking.identity);

    const remote = this.core.participants.find((p) => !p.isLocal && cams[p.identity]);
    if (remote) return cam(remote.identity);

    const anyId = Object.keys(cams)[0];
    return anyId ? cam(anyId) : null;
  }

  onTrackSubscribed(track: RemoteTrack, pub: RemoteTrackPublication, p: Participant) {
    if (track.kind === Track.Kind.Audio) {
      this.core.audio.attach(
        p.identity,
        track,
        this.core.deafened,
        pub.source === Track.Source.ScreenShareAudio,
      );
      if (pub.source === Track.Source.ScreenShareAudio) {
        this.share.audio = {
          ...this.share.audio,
          [p.identity]: { volume: 1, muted: false },
        };
        this.core.audio.applyStream(
          p.identity,
          this.share.audio[p.identity],
          this.core.deafened,
        );
      }
    } else if (pub.source === Track.Source.ScreenShare) {
      this.share.screens = { ...this.share.screens, [p.identity]: track };
      if (this.pendingWatch === p.identity) {
        this.share.watching = p.identity;
        this.pendingWatch = null;
      }
    } else if (pub.source === Track.Source.Camera) {
      this.syncRemoteCamera(p.identity, pub);
    }
    this.core.refresh();
  }

  onTrackUnsubscribed(track: RemoteTrack, pub: RemoteTrackPublication, p: Participant) {
    this.core.audio.detach(p.identity, track);
    if (pub.source === Track.Source.ScreenShare) this.dropScreen(p.identity);
    if (pub.source === Track.Source.ScreenShareAudio) this.dropScreenAudio(p.identity);
    if (pub.source === Track.Source.Camera) this.dropCamera(p.identity);
    this.core.refresh();
  }

  onLocalTrackPublished(pub: LocalTrackPublication, room: Room) {
    const identity = room.localParticipant.identity;
    if (pub.source === Track.Source.ScreenShare && pub.track) {
      this.share.screens = { ...this.share.screens, [identity]: pub.track };
      this.announceSharing(true);
    } else if (pub.source === Track.Source.Camera) {
      this.syncLocalCamera();
    }
    this.core.refresh();
  }

  onLocalTrackUnpublished(pub: LocalTrackPublication, room: Room) {
    const identity = room.localParticipant.identity;
    if (pub.source === Track.Source.ScreenShare) {
      this.dropScreen(identity);
      this.announceSharing(false);
    } else if (pub.source === Track.Source.Camera) {
      this.syncLocalCamera();
    }
    this.core.refresh();
  }

  // A camera turns off by muting its track, not unpublishing, so this is its off-signal.
  onCameraMuteChanged(pub: TrackPublication, p: Participant) {
    if (pub.source === Track.Source.Camera) {
      if (p.isLocal) this.syncLocalCamera();
      else this.syncRemoteCamera(p.identity, pub as RemoteTrackPublication);
    }
    this.core.refresh();
  }

  async toggleScreenShare() {
    const lp = this.core.room?.localParticipant;
    if (!lp || !this.core.canPublish) return;
    try {
      await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: true });
    } catch (e) {
      if (errorName(e) !== "NotAllowedError")
        this.core.error = `Couldn't share your screen (${errorName(e)}).`;
    }
    this.core.refresh();
  }

  async toggleCamera() {
    const lp = this.core.room?.localParticipant;
    if (!lp || !this.core.canPublish) return;
    try {
      await lp.setCameraEnabled(!lp.isCameraEnabled);
    } catch (e) {
      if (errorName(e) !== "NotAllowedError")
        this.core.error = `Couldn't turn on your camera (${errorName(e)}).`;
    }
    this.core.refresh();
  }

  async watch(target: Channel, identity: string) {
    if (!this.share.screens[identity] && this.core.channel?.id !== target.id) {
      await this.core.join(target);
    }
    if (this.share.screens[identity]) this.share.watching = identity;
    else this.pendingWatch = identity;
  }

  stopWatching() {
    this.share.watching = null;
    this.pendingWatch = null;
  }

  setStreamVolume(identity: string, volume: number) {
    const settings = this.share.audio[identity];
    if (!settings) return;
    const clamped = Math.min(1, Math.max(0, volume));
    this.share.audio = {
      ...this.share.audio,
      [identity]: { volume: clamped, muted: clamped === 0 },
    };
    this.core.audio.applyStream(identity, this.share.audio[identity], this.core.deafened);
  }

  toggleStreamMute(identity: string) {
    const settings = this.share.audio[identity];
    if (!settings) return;
    this.share.audio = {
      ...this.share.audio,
      [identity]: { ...settings, muted: !settings.muted },
    };
    this.core.audio.applyStream(identity, this.share.audio[identity], this.core.deafened);
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
    this.core.audio.dropStream(identity);
    const next = { ...this.share.audio };
    delete next[identity];
    this.share.audio = next;
  }

  private syncRemoteCamera(identity: string, pub: RemoteTrackPublication) {
    if (pub.track && !pub.isMuted)
      this.share.cameras = { ...this.share.cameras, [identity]: pub.track };
    else this.dropCamera(identity);
  }

  private syncLocalCamera() {
    const lp = this.core.room?.localParticipant;
    if (!lp) return;

    const on = lp.isCameraEnabled;
    const pub = lp.getTrackPublication(Track.Source.Camera);
    if (on && pub?.track)
      this.share.cameras = { ...this.share.cameras, [lp.identity]: pub.track };
    else this.dropCamera(lp.identity);

    if (on !== this.cameraAnnounced) {
      this.cameraAnnounced = on;
      this.announceCamera(on);
    }
  }

  private announceSharing(sharing: boolean) {
    realtime.send({ type: ClientEventType.Screen_Share_Set, sharing });
  }

  private announceCamera(camera: boolean) {
    realtime.send({ type: ClientEventType.Camera_Set, camera });
  }

  reset() {
    this.share = emptyShare();
    this.pendingWatch = null;
    this.cameraAnnounced = false;
  }
}
