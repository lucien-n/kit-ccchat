import type { SetupBody } from "@ccchat/shared";
import type { JsonContext } from "../../http/context.js";
import * as setupService from "./setup.service.js";

export function claim(c: JsonContext<SetupBody>) {
  return c.json(setupService.claimCommunity(c.req.valid("json")));
}
