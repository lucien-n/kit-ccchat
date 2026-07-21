import { muteBody } from "@ccchat/shared";
import type { Context, Next } from "hono";
import type { Env } from "../../auth.js";
import type { User } from "../../db/schema";
import type { JsonContext } from "../../http/context.js";
import * as moderationService from "./moderation.service.js";

/** The moderation target is resolved once by middleware, so every handler below
 *  reads it off the context instead of re-querying. */
export type ModEnv = { Variables: Env["Variables"] & { target: User } };

/** Every `/:id` action needs the same target lookup and rank check, so it runs
 *  once here and lands on the context. */
export async function loadTarget(c: Context<ModEnv>, next: Next) {
  c.set(
    "target",
    moderationService.resolveTarget(c.get("user"), c.req.param("id") ?? ""),
  );
  await next();
}

export function kick(c: Context<ModEnv>) {
  moderationService.kick(c.get("target"));
  return c.json({ ok: true });
}

export function ban(c: Context<ModEnv>) {
  moderationService.ban(c.get("target"));
  return c.json({ ok: true });
}

export function unban(c: Context<ModEnv>) {
  moderationService.unban(c.get("target"));
  return c.json({ ok: true });
}

export function mute(c: JsonContext<typeof muteBody, "/:id", ModEnv>) {
  const mutedUntil = moderationService.mute(c.get("target"), c.req.valid("json").minutes);
  return c.json({ ok: true, mutedUntil });
}

export function unmute(c: Context<ModEnv>) {
  moderationService.unmute(c.get("target"));
  return c.json({ ok: true });
}

export function members(c: Context<ModEnv>) {
  return c.json({ members: moderationService.listMembers() });
}
