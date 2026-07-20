import type { AppContext } from "../../http/context.js";
import * as systemService from "./system.service.js";

export async function stats(c: AppContext) {
  return c.json({ stats: await systemService.collectSystemStats() });
}
