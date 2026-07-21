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

const router = new Hono<Env>()
  .use("*", requireAuth)
  .get("/", rolesController.list)
  .post(
    "/",
    requireCan("manageRoles"),
    validate("json", createRoleBody),
    rolesController.create,
  )
  .patch(
    "/:id",
    requireCan("manageRoles"),
    validate("json", updateRoleBody),
    rolesController.update,
  )
  .put(
    "/order",
    requireCan("manageRoles"),
    validate("json", reorderRolesBody),
    rolesController.reorder,
  )
  .delete("/:id", requireCan("manageRoles"), rolesController.remove)
  .put(
    "/members/:userId",
    requireCan("manageRoles"),
    validate("json", setUserRolesBody),
    rolesController.setForUser,
  );

export default router;
