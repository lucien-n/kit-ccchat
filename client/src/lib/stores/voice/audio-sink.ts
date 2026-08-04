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

  attach(
    identity: string,
    track: RemoteTrack,
    deafened: boolean,
    isStreamAudio: boolean,
  ) {
    const el = track.attach();
    el.style.display = "none";
    el.muted = deafened;
    document.body.appendChild(el);
    this.audioEls.set(`${identity}:${track.sid}`, el);
    if (isStreamAudio) this.streamEls.set(identity, el);
  }

  detach(identity: string, track: RemoteTrack) {
    track.detach().forEach((el) => el.remove());
    this.audioEls.delete(`${identity}:${track.sid}`);
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
  }
}
