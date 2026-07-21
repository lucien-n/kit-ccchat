import { avatarBody, changePasswordBody, updateProfileBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as usersService from "./users.service.js";

export function list(c: AppContext) {
  return c.json({ members: usersService.listMembers() });
}

/** Public (no auth): <img> tags can't send bearer tokens, and avatars aren't
 *  secret. */
export function avatar(c: AppContext<"/:id/avatar">) {
  const { bytes, mime } = usersService.readAvatar(c.req.param("id"));
  c.header("Content-Type", mime);
  // These are attacker-supplied bytes on our own origin, and our own origin is
  // where the session token lives. Never let a browser re-interpret them.
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(bytes);
}

export function uploadAvatar(c: JsonContext<typeof avatarBody>) {
  const avatarVersion = usersService.saveAvatar(c.get("user").id, c.req.valid("json"));
  return c.json({ avatarVersion });
}

export function removeAvatar(c: AppContext) {
  usersService.deleteAvatar(c.get("user").id);
  return c.json({ ok: true });
}

export function updateProfile(c: JsonContext<typeof updateProfileBody>) {
  const user = usersService.updateProfile(c.get("user"), c.req.valid("json").displayName);
  return c.json({ user });
}

export function changePassword(c: JsonContext<typeof changePasswordBody>) {
  usersService.changePassword(c.get("user"), c.req.valid("json"));
  return c.json({ ok: true });
}

export function get(c: AppContext) {
  return c.json(usersService.getUser(String(c.req.param("id"))));
}
