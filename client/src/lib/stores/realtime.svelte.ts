import type { ClientEvent, ServerEvent } from "@ccchat/shared";
import { apiBase } from "../api";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

const BASE_DELAY = 1000;
const MAX_DELAY = 30_000;

/** Exponential backoff jittered across the back half of the window, so everyone
 *  who dropped on a server restart doesn't stampede back in the same instant. */
export function reconnectDelay(attempt: number, random = Math.random): number {
  const window = Math.min(MAX_DELAY, BASE_DELAY * 2 ** attempt);
  return window / 2 + random() * (window / 2);
}

function wsUrl(token: string): string {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const u = new URL(apiBase() || location.origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws";
  u.search = `?token=${encodeURIComponent(token)}`;
  return u.toString();
}

interface Handlers {
  event: (event: ServerEvent) => void;
  /** Fires only after a reconnect gap: the server does not replay what it pushed
   *  while the socket was down, so the caller has to refetch. */
  resync: () => void;
}

/** Owns the socket lifecycle and nothing else; what an event means is the
 *  caller's decision, which keeps this from regrowing into a god-store. */
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
    // Cleared before close() so onclose sees it was superseded and doesn't
    // reconnect a session we just ended.
    this.ws = null;
    ws?.close();
    this.status = "disconnected";
  }

  /** False when the socket is down, so the caller can surface it rather than let
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
      // attempts only leaves zero after a failed retry, so a nonzero count means
      // we were disconnected for a while and missed events.
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
