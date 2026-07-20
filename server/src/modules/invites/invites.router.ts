import { createInviteBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as invitesController from "./invites.controller.js";

const router = new Hono<Env>();

router.use("*", requireAuth, requireCan("manageInvites"));

router.post("/", validate("json", createInviteBody), invitesController.create);
router.get("/", invitesController.list);
router.post("/:code/revoke", invitesController.revoke);

export default router;
