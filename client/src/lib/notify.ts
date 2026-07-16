/** Notification helpers: synthesized cues (no audio assets) and a document-title
 *  unread badge. All browser-only; callers run in the SPA. */

let ctx: AudioContext | null = null;

/** Browsers block audio until the user interacts. Call once on first gesture so
 *  later cues actually play. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* AudioContext unavailable - cues simply no-op */
  }
}

/** Play a sequence of short sine-wave notes: [frequencyHz, durationSeconds]. */
function playSequence(notes: Array<[number, number]>) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    let t = ctx.currentTime;
    for (const [freq, dur] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur;
    }
  } catch {
    /* ignore - audio is a nicety, never fatal */
  }
}

export const playPing = () =>
  playSequence([
    [880, 0.18],
    [1174.7, 0.18],
  ]);

/** Voice cues: rising = joined, falling = left, and short blips for mic state. */
export const playVoiceJoin = () =>
  playSequence([
    [523.25, 0.1],
    [659.25, 0.1],
    [783.99, 0.14],
  ]);
export const playVoiceLeave = () =>
  playSequence([
    [783.99, 0.1],
    [659.25, 0.1],
    [523.25, 0.14],
  ]);
export const playUnmute = () => playSequence([[660, 0.09]]);
export const playMute = () => playSequence([[440, 0.09]]);

let baseTitle = "ccchat";
export function setBaseTitle(title: string) {
  baseTitle = title;
  document.title = baseTitle;
}

/** Prefix the tab title with an unread count, e.g. "(3) My Community". */
export function setTitleBadge(count: number) {
  if (typeof document === "undefined") return;
  document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
}
