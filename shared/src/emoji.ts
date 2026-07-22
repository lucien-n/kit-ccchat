import { z } from "zod";
import { EMOJI_GLYPHS } from "./emoji-glyphs.js";

/** Built on first use rather than at import: this module rides along in the
 *  client bundle for the schema alone, and most sessions never validate one. */
let renderable: Set<string> | null = null;

export function isRenderableEmoji(value: string): boolean {
  renderable ??= new Set(EMOJI_GLYPHS);
  return renderable.has(value);
}

/** A single emoji from the set the picker offers, matched exactly.
 *
 *  Membership, not a pattern: `\p{Extended_Pictographic}` would accept plenty
 *  the Twemoji font cannot draw, and one hand-written request is enough to plant
 *  a permanent tofu box in a channel. Exact matching also rejects skin-tone and
 *  other variation sequences, which the picker does not offer either. */
export const reactionEmoji = z.string().refine(isRenderableEmoji, "unsupported emoji");
