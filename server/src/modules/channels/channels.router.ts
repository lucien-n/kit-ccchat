import {
  createChannelBody,
  renameChannelBody,
  reorderChannelsBody,
} from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as channelsController from "./channels.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth)
  .get("/", channelsController.list)
  .get("/unreads", channelsController.unreads)
  .post("/:id/read", channelsController.markRead)
  .post(
    "/",
    requireCan("manageChannels"),
    validate("json", createChannelBody),
    channelsController.create,
  )
  .patch(
    "/:id",
    requireCan("manageChannels"),
    validate("json", renameChannelBody),
    channelsController.rename,
  )
  .put(
    "/order",
    requireCan("manageChannels"),
    validate("json", reorderChannelsBody),
    channelsController.reorder,
  )
  .post("/:id/main", requireCan("manageChannels"), channelsController.setMain)
  .delete("/:id", requireCan("manageChannels"), channelsController.remove);

export default router;
