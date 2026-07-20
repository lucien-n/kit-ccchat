import { communityIconBody, renameCommunityBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as settingsController from "./settings.controller.js";

const router = new Hono<Env>();

// Auth is per-route rather than on "*": the icon is served to <img> tags and to
// the login screen's favicon, neither of which can present a token.
router.get("/icon", settingsController.icon);

router.patch(
  "/",
  requireAuth,
  requireCan("manageCommunity"),
  validate("json", renameCommunityBody),
  settingsController.rename,
);

router.post(
  "/icon",
  requireAuth,
  requireCan("manageCommunity"),
  validate("json", communityIconBody),
  settingsController.setIcon,
);

router.delete(
  "/icon",
  requireAuth,
  requireCan("manageCommunity"),
  settingsController.removeIcon,
);

export default router;
