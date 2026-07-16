import type { ClientEvent, ServerEvent } from "@ccchat/shared";
import { apiBase } from "../api";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

const BASE_DELAY = 1000;
const MAX_DELAY = 30_000;

/** Exponential backoff, then a random point in the back half of the window. A
 *  fixed delay means everyone who dropped when the server restarted comes back
 *  in the same instant, and keeps colliding on every retry after that. */
export function reconnectDelay(attempt: number, random = Math.random): number {
  const window = Math.min(MAX_DELAY, BASE_DELAY * 2 ** attempt);
  return window / 2 + random() * (window / 2);
}

function wsUrl(token: string): string {
  // Local, stringified before it escapes: never reactive state, so SvelteURL
  // would buy nothing.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const u = new URL(apiBase() || location.origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws";
  u.search = `?token=${encodeURIComponent(token)}`;
  return u.toString();
}

interface Handlers {
  event: (event: ServerEvent) => void;
  /** Anything the server pushed while the socket was down was missed, and it
   *  does not replay. Fires only after a gap, never on a clean first connect. */
  resync: () => void;
}

/** The socket, and only the socket: it owns the connection lifecycle and hands
 *  events off. Deciding what an event means belongs to the caller, which is
 *  what keeps this from growing back into the store that knew everything. */
class Realtime {
  status = $state<ConnectionStatus>("disconnected");

  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private handlers: Handlers | null = null;
  private attempts = 0;

  start(token: string, handlers: Handlers) {
    this.stop();
    this.token = token;
    this.handlers = handlers;
    this.attempts = 0;
    this.open();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.token = null;
    const ws = this.ws;
    // Cleared before close() so the onclose below sees it was superseded and
    // doesn't schedule a reconnect for a session we just ended.
    this.ws = null;
    ws?.close();
    this.status = "disconnected";
  }

  /** False when the socket isn't up, so the caller can say so rather than let
   *  the message vanish. */
  send(event: ClientEvent): boolean {
    if (!this.ws || this.status !== "connected") return false;
    this.ws.send(JSON.stringify(event));
    return true;
  }

  private open() {
    if (!this.token || this.ws) return;
    this.status = "connecting";
    const ws = new WebSocket(wsUrl(this.token));
    this.ws = ws;

    ws.onopen = () => {
      // A retry got us here, so there was a window where we were missing events.
      // Counts as a gap even on the first connect: `attempts` only leaves zero
      // after a failure.
      const gap = this.attempts > 0;
      this.status = "connected";
      this.attempts = 0;
      if (gap) this.handlers?.resync();
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.status = "disconnected";
      if (this.token) this.reopen();
    };

    ws.onmessage = (ev) => {
      let event: ServerEvent;
      try {
        event = JSON.parse(ev.data);
      } catch {
        return;
      }
      this.handlers?.event(event);
    };
  }

  private reopen() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.open(), reconnectDelay(this.attempts++));
  }
}

export const realtime = new Realtime();
