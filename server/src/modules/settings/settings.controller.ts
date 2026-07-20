import type { RenameCommunityBody } from "@ccchat/shared";
import type { JsonContext } from "../../http/context.js";
import * as settingsService from "./settings.service.js";

export function rename(c: JsonContext<RenameCommunityBody>) {
  settingsService.renameCommunity(c.req.valid("json").communityName);
  return c.json({ communityName: settingsService.communityName() });
}
