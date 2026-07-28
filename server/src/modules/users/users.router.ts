import {
  avatarBody,
  bannerBody,
  changePasswordBody,
  updateProfileBody,
} from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as usersController from "./users.controller.js";

const router = new Hono<Env>()
  .get("/", requireAuth, usersController.list)
  .get("/:id/avatar", usersController.avatar)
  .post(
    "/me/avatar",
    requireAuth,
    validate("json", avatarBody),
    usersController.uploadAvatar,
  )
  .delete("/me/avatar", requireAuth, usersController.removeAvatar)
  .get("/:id/banner", usersController.banner)
  .post(
    "/me/banner",
    requireAuth,
    validate("json", bannerBody),
    usersController.uploadBanner,
  )
  .delete("/me/banner", requireAuth, usersController.removeBanner)
  .patch(
    "/me",
    requireAuth,
    validate("json", updateProfileBody),
    usersController.updateProfile,
  )
  .post(
    "/me/password",
    requireAuth,
    validate("json", changePasswordBody),
    usersController.changePassword,
  )
  .get("/:id", requireAuth, usersController.get);

export default router;
