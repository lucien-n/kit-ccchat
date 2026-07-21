import { editMessageBody, messageAroundQuery, messageHistoryQuery } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as messagesController from "./messages.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth)
  .get("/:channelId", validate("query", messageHistoryQuery), messagesController.history)
  .get(
    "/:channelId/around/:messageId",
    validate("query", messageAroundQuery),
    messagesController.around,
  )
  .patch("/:id", validate("json", editMessageBody), messagesController.edit)
  .delete("/:id", messagesController.remove);

export default router;
