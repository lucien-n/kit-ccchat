import { type RemoteTrack } from "livekit-client";

export interface StreamAudio {
  volume: number;
  muted: boolean;
}

type Identity = string;
type TrackSid = string;

export class AudioSink {
  private audioEls = new Map<`${Identity}:${TrackSid}`, HTMLMediaElement>();
  private streamEls = new Map<Identity, HTMLMediaElement>();
  private soundboardEls = new Map<`${Identity}:${TrackSid}`, HTMLMediaElement>();
  private soundboardVolume = 1;

  attach(
    identity: string,
    track: RemoteTrack,
    deafened: boolean,
    isStreamAudio: boolean,
    isSoundboard: boolean,
  ) {
    const el = track.attach();
    el.style.display = "none";
    el.muted = deafened;
    document.body.appendChild(el);
    this.audioEls.set(`${identity}:${track.sid}`, el);
    if (isStreamAudio) this.streamEls.set(identity, el);
    if (isSoundboard) {
      el.volume = this.soundboardVolume;
      this.soundboardEls.set(`${identity}:${track.sid}`, el);
    }
  }

  detach(identity: string, track: RemoteTrack) {
    track.detach().forEach((el) => el.remove());
    this.audioEls.delete(`${identity}:${track.sid}`);
    this.soundboardEls.delete(`${identity}:${track.sid}`);
  }

  /** Listening level for other people's soundboard clips, held here so clips that
   *  arrive later pick it up too. Volume and deafen (muted) are independent. */
  setSoundboardVolume(volume: number) {
    this.soundboardVolume = volume;
    for (const el of this.soundboardEls.values()) el.volume = volume;
  }

  dropStream(identity: string) {
    this.streamEls.delete(identity);
  }

  applyStream(identity: string, settings: StreamAudio | undefined, deafened: boolean) {
    const el = this.streamEls.get(identity);
    if (!el || !settings) return;
    el.volume = settings.volume;
    el.muted = deafened || settings.muted;
  }

  setDeafened(deafened: boolean, streams: Record<string, StreamAudio>) {
    for (const el of this.audioEls.values()) el.muted = deafened;
    for (const identity of this.streamEls.keys())
      this.applyStream(identity, streams[identity], deafened);
  }

  clear() {
    for (const el of this.audioEls.values()) el.remove();
    this.audioEls.clear();
    this.streamEls.clear();
    this.soundboardEls.clear();
  }
}
