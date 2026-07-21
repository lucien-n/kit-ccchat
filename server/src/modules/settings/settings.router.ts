import { communityIconBody, renameCommunityBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as settingsController from "./settings.controller.js";

// Auth is per-route rather than on "*": the icon is served to <img> tags and to
// the login screen's favicon, neither of which can present a token.
const router = new Hono<Env>()
  .get("/icon", settingsController.icon)
  .patch(
    "/",
    requireAuth,
    requireCan("manageCommunity"),
    validate("json", renameCommunityBody),
    settingsController.rename,
  )
  .post(
    "/icon",
    requireAuth,
    requireCan("manageCommunity"),
    validate("json", communityIconBody),
    settingsController.setIcon,
  )
  .delete(
    "/icon",
    requireAuth,
    requireCan("manageCommunity"),
    settingsController.removeIcon,
  );

export default router;
