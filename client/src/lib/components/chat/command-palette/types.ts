import type { Component } from "svelte";

export interface PaletteResult {
  id: string;
  label: string;
  subtitle?: string;
  icon: Component;
  onSelect: () => void;
}

/** App actions a provider's `onSelect` may fire, injected by the palette so the
 *  provider modules stay free of component context. */
export interface PaletteContext {
  /** Dismiss the palette. */
  close: () => void;
  /** Open a message's channel, scroll to it, and flash it. */
  jumpToMessage: (channelId: string, messageId: string) => void;
}

/** A searchable source. The registry is a list of these; adding attachments or
 *  members later means adding one object here, and touching nothing else. */
export interface PaletteProvider {
  group: string;
  /** Prime data on palette open (e.g. lazily fetch the soundboard). */
  open?(): void;
  /** Release state on palette close (e.g. reset a server-search store). */
  close?(): void;
  /** Kick off async work for a query; the only place a provider may mutate. */
  sync?(query: string): void;
  results(query: string, ctx: PaletteContext): PaletteResult[];
  readonly loading?: boolean;
}
