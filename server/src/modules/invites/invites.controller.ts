import type { CreateInviteBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as invitesService from "./invites.service.js";

export function create(c: JsonContext<CreateInviteBody>) {
  const invite = invitesService.createInvite(c.req.valid("json"), c.get("user").id);
  return c.json({ invite });
}

export function list(c: AppContext) {
  return c.json({ invites: invitesService.listInvites() });
}

export function revoke(c: AppContext) {
  return c.json({ invite: invitesService.revokeInvite(String(c.req.param("code"))) });
}
