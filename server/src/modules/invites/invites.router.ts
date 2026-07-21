import { createInviteBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as invitesController from "./invites.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth, requireCan("manageInvites"))
  .post("/", validate("json", createInviteBody), invitesController.create)
  .get("/", invitesController.list)
  .post("/:code/revoke", invitesController.revoke);

export default router;
