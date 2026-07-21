import { communityIconBody, renameCommunityBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import { sendImage } from "../../http/image.js";
import * as settingsService from "./settings.service.js";

export function rename(c: JsonContext<typeof renameCommunityBody>) {
  settingsService.renameCommunity(c.req.valid("json").communityName);
  return c.json({ communityName: settingsService.communityName() });
}

export function icon(c: AppContext) {
  return sendImage(c, settingsService.readIcon());
}

export function setIcon(c: JsonContext<typeof communityIconBody>) {
  return c.json({ iconVersion: settingsService.setIcon(c.req.valid("json")) });
}

export function removeIcon(c: AppContext) {
  settingsService.clearIcon();
  return c.json({ ok: true });
}
