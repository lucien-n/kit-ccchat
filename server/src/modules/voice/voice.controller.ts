import { voiceTokenBody } from "@ccchat/shared";
import type { Context } from "hono";
import { LIVEKIT_PATH, LIVEKIT_URL } from "../../env.js";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as voiceService from "./voice.service.js";

/** Derived from the request so the client reaches LiveKit through whatever proxy
 *  fronted us. Falling back to the raw Host header keeps `npm run dev` working,
 *  where there is no proxy to set X-Forwarded-Proto. */
function livekitUrl(c: Context): string {
  if (LIVEKIT_URL) return LIVEKIT_URL;

  const forwarded = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "localhost";
  const secure = forwarded
    ? forwarded === "https"
    : new URL(c.req.url).protocol === "https:";

  return `${secure ? "wss" : "ws"}://${host}${LIVEKIT_PATH}`;
}

export function config(c: AppContext) {
  return c.json({ url: livekitUrl(c) });
}

export async function token(c: JsonContext<typeof voiceTokenBody>) {
  const issued = await voiceService.issueVoiceToken(
    c.req.valid("json").channelId,
    c.get("user"),
  );
  return c.json({ ...issued, url: livekitUrl(c) });
}
