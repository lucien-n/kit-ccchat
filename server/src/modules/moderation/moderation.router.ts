import { muteBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan } from "../../auth.js";
import { validate } from "../../validate.js";
import * as moderationController from "./moderation.controller.js";

const router = new Hono<moderationController.ModEnv>()
  .use("*", requireAuth, requireCan("moderateMembers"))
  .post("/:id/kick", moderationController.loadTarget, moderationController.kick)
  .post("/:id/ban", moderationController.loadTarget, moderationController.ban)
  .post("/:id/unban", moderationController.loadTarget, moderationController.unban)
  .post(
    "/:id/mute",
    moderationController.loadTarget,
    validate("json", muteBody),
    moderationController.mute,
  )
  .post("/:id/unmute", moderationController.loadTarget, moderationController.unmute)
  .get("/members", moderationController.members);

export default router;
