import { ClientEventType, TYPING_THROTTLE_MS } from "@ccchat/shared";
import {
  stillOnline,
  typistsIn,
  unexpired,
  withoutTypist,
  withTypist,
  type Typist,
} from "../typing";
import { realtime } from "./realtime.svelte";
import { session } from "./session.svelte";

const SWEEP_MS = 1000;

/** Who is typing where. Nobody ever announces that they stopped: entries expire,
 *  and the three things that really end a message (it arrives, the typist goes
 *  offline, they walk away) each clear it early. */
class Typing {
  #typists = $state<Typist[]>([]);
  #sweeper: ReturnType<typeof setInterval> | null = null;

  #lastSentAt = 0;
  #lastSentTo = "";

  /** User ids typing in this channel, never including you. Your own event comes
   *  back like everyone else's, and watching yourself type is nonsense. */
  inChannel(channelId: string): string[] {
    return typistsIn(this.#typists, channelId, session.user?.id);
  }

  started(channelId: string, userId: string) {
    this.#typists = withTypist(this.#typists, channelId, userId);
    this.#sweeper ??= setInterval(() => this.#sweep(), SWEEP_MS);
  }

  stopped(channelId: string, userId: string) {
    this.#replace(withoutTypist(this.#typists, channelId, userId));
  }

  /** Presence is the only warning we get that a typist dropped off. */
  keepOnly(online: string[]) {
    this.#replace(stillOnline(this.#typists, online));
  }

  /** Announce that you are typing in this channel, at most once per window. */
  signal(channelId: string) {
    const now = Date.now();
    if (channelId === this.#lastSentTo && now - this.#lastSentAt < TYPING_THROTTLE_MS)
      return;
    if (!realtime.send({ type: ClientEventType.Typing_Start, channelId })) return;
    this.#lastSentTo = channelId;
    this.#lastSentAt = now;
  }

  /** Sending a message clears you everywhere, so the next keystroke has to be
   *  able to announce you again rather than wait out the window. */
  resetSignal() {
    this.#lastSentAt = 0;
    this.#lastSentTo = "";
  }

  clear() {
    this.#typists = [];
    this.resetSignal();
    this.#stopSweeping();
  }

  // One interval for all of them rather than a timer each, idle whenever nobody
  // is typing.
  #sweep() {
    this.#replace(unexpired(this.#typists));
    if (!this.#typists.length) this.#stopSweeping();
  }

  #replace(next: Typist[]) {
    if (next.length !== this.#typists.length) this.#typists = next;
  }

  #stopSweeping() {
    if (this.#sweeper) clearInterval(this.#sweeper);
    this.#sweeper = null;
  }
}

export const typing = new Typing();
