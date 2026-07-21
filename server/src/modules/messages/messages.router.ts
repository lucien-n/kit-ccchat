import { editMessageBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as messagesController from "./messages.controller.js";

const router = new Hono<Env>();

router.use("*", requireAuth);

router.get("/:channelId", messagesController.history);
router.get("/:channelId/around/:messageId", messagesController.around);
router.patch("/:id", validate("json", editMessageBody), messagesController.edit);
router.delete("/:id", messagesController.remove);

export default router;
