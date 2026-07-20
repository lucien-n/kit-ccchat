import { muteBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan } from "../../auth.js";
import { validate } from "../../validate.js";
import * as moderationController from "./moderation.controller.js";

const router = new Hono<moderationController.ModEnv>();

router.use("*", requireAuth, requireCan("moderateMembers"));

router.post("/:id/kick", moderationController.loadTarget, moderationController.kick);
router.post("/:id/ban", moderationController.loadTarget, moderationController.ban);
router.post("/:id/unban", moderationController.loadTarget, moderationController.unban);
router.post(
  "/:id/mute",
  moderationController.loadTarget,
  validate("json", muteBody),
  moderationController.mute,
);
router.post("/:id/unmute", moderationController.loadTarget, moderationController.unmute);
router.get("/members", moderationController.members);

export default router;
