import type { AppContext } from "../../http/context.js";
import * as linkEmbedsService from "./link-embeds.service.js";

// Proxy an embed's thumbnail (server-side fetch, so the reader never touches the
// linked site). No auth - an <img> can't send a token - but nosniff guards the
// unvalidated remote content-type.
export async function image(c: AppContext<"/:id/image">) {
  const { body, contentType } = await linkEmbedsService.fetchEmbedImage(
    c.req.param("id"),
  );
  return c.body(new Uint8Array(body), 200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    // Cache a day: avoid re-proxying every render, but shorter than attachments
    // since the remote image could change under the same URL.
    "Cache-Control": "public, max-age=86400",
  });
}
