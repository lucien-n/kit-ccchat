import { Track, type LocalParticipant } from "livekit-client";
import { SoundCache } from "./sound-cache";

const MAX_CACHED_SOUNDS = 32;

/** Plays soundboard clips into the call over Web Audio. Owns its AudioContext
 *  and decode cache, both kept alive across calls since clips get spammed. */
export class SoundboardPlayer {
  #ctx: AudioContext | null = null;
  #cache = new SoundCache(MAX_CACHED_SOUNDS);

  /** Play a clip. LiveKit won't loop your own audio back, so it's always routed
   *  to the local speakers; when `broadcast` it's also published to everyone
   *  else, then unpublished when the clip ends. `onActiveChange(±1)` brackets
   *  that publish so the caller can light its own speaking ring meanwhile. */
  async play(
    lp: LocalParticipant,
    url: string,
    broadcast: boolean,
    onActiveChange: (delta: number) => void,
  ): Promise<void> {
    const ctx = (this.#ctx ??= new AudioContext());
    // Fetch/decode doesn't need a running context, so overlap it with resume.
    const bufferP = this.#cache.load(ctx, url);
    if (ctx.state === "suspended") await ctx.resume();

    const buffer = await bufferP;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination); // -> so you always hear it yourself

    if (!broadcast) {
      src.start();
      return;
    }

    const dest = ctx.createMediaStreamDestination();
    src.connect(dest); // -> published to everyone else
    const track = dest.stream.getAudioTracks()[0];
    await lp.publishTrack(track, {
      // Not Microphone: keeps the clip off the mic-state UI and mute logic.
      source: Track.Source.Unknown,
      name: "soundboard",
    });
    onActiveChange(1);
    src.onended = () => {
      void lp.unpublishTrack(track);
      track.stop();
      onActiveChange(-1);
    };
    src.start();
  }
}
