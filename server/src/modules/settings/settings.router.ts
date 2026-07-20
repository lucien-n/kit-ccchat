import { renameCommunityBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as settingsController from "./settings.controller.js";

const router = new Hono<Env>();

router.use("*", requireAuth);

router.patch(
  "/",
  requireCan("manageCommunity"),
  validate("json", renameCommunityBody),
  settingsController.rename,
);

export default router;
