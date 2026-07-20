import { createChannelBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as channelsController from "./channels.controller.js";

const router = new Hono<Env>();

router.use("*", requireAuth);

router.get("/", channelsController.list);
router.get("/unreads", channelsController.unreads);
router.post("/:id/read", channelsController.markRead);
router.post(
  "/",
  requireCan("manageChannels"),
  validate("json", createChannelBody),
  channelsController.create,
);
router.delete("/:id", requireCan("manageChannels"), channelsController.remove);

export default router;
