import {
  createRoleBody,
  reorderRolesBody,
  setUserRolesBody,
  updateRoleBody,
} from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as rolesController from "./roles.controller.js";

const router = new Hono<Env>();

router.use("*", requireAuth);

router.get("/", rolesController.list);
router.post(
  "/",
  requireCan("manageRoles"),
  validate("json", createRoleBody),
  rolesController.create,
);
router.patch(
  "/:id",
  requireCan("manageRoles"),
  validate("json", updateRoleBody),
  rolesController.update,
);
router.put(
  "/order",
  requireCan("manageRoles"),
  validate("json", reorderRolesBody),
  rolesController.reorder,
);
router.delete("/:id", requireCan("manageRoles"), rolesController.remove);
router.put(
  "/members/:userId",
  requireCan("manageRoles"),
  validate("json", setUserRolesBody),
  rolesController.setForUser,
);

export default router;
