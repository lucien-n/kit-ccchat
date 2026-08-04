/** Decoded soundboard clips cached by url. Decode is costly and clips get
 *  spammed, so buffers are reused; each is multiple MB, so the least-recently-
 *  played is evicted once past the cap. */
export class SoundCache {
  #buffers = new Map<string, Promise<AudioBuffer>>();
  #max: number;

  constructor(max: number) {
    this.#max = max;
  }

  load(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const cached = this.#buffers.get(url);
    if (cached) {
      // Re-insert to mark most-recently-played (Map keeps insertion order).
      this.#buffers.delete(url);
      this.#buffers.set(url, cached);
      return cached;
    }

    const buffer = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((bytes) => ctx.decodeAudioData(bytes));
    buffer.catch(() => this.#buffers.delete(url)); // let a failed load retry
    this.#buffers.set(url, buffer);
    if (this.#buffers.size > this.#max) {
      const oldest = this.#buffers.keys().next().value;
      if (oldest !== undefined) this.#buffers.delete(oldest);
    }
    return buffer;
  }
}
