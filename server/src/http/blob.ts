import type { Context } from "hono";
import type { StoredBlob } from "../blob.js";

/** Served without auth (media tags can't send bearer tokens), so nosniff keeps a
 *  browser from re-interpreting attacker bytes on the origin that holds the token. */
export function sendBlob(c: Context, { bytes, mime }: StoredBlob) {
  c.header("Content-Type", mime);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(bytes);
}
