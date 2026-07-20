import type { Context } from "hono";
import type { StoredImage } from "../images.js";

/** Serve stored image bytes. Public by design: <img> tags can't send bearer
 *  tokens, and neither avatars nor the community icon are secret. */
export function sendImage(c: Context, { bytes, mime }: StoredImage) {
  c.header("Content-Type", mime);
  // These are attacker-supplied bytes on our own origin, and our own origin is
  // where the session token lives. Never let a browser re-interpret them.
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(bytes);
}
