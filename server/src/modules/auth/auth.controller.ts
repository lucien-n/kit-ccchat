import { loginBody, registerBody } from "@ccchat/shared";
import { destroySession } from "../../auth.js";
import type { AppContext, JsonContext } from "../../http/context.js";
import { toMember } from "../../views.js";
import * as authService from "./auth.service.js";

export function register(c: JsonContext<typeof registerBody>) {
  return c.json(authService.register(c.req.valid("json")));
}

export function login(c: JsonContext<typeof loginBody>) {
  return c.json(authService.login(c.req.valid("json")));
}

export function logout(c: AppContext) {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) destroySession(header.slice(7));
  return c.json({ ok: true });
}

export function me(c: AppContext) {
  return c.json({ user: toMember(c.get("user")) });
}
