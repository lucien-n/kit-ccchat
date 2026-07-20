import { avatarBody, changePasswordBody, updateProfileBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as usersController from "./users.controller.js";

const router = new Hono<Env>();

router.get("/", requireAuth, usersController.list);
router.get("/:id/avatar", usersController.avatar);
router.post(
  "/me/avatar",
  requireAuth,
  validate("json", avatarBody),
  usersController.uploadAvatar,
);
router.delete("/me/avatar", requireAuth, usersController.removeAvatar);
router.patch(
  "/me",
  requireAuth,
  validate("json", updateProfileBody),
  usersController.updateProfile,
);
router.post(
  "/me/password",
  requireAuth,
  validate("json", changePasswordBody),
  usersController.changePassword,
);
router.get("/:id", requireAuth, usersController.get);

export default router;
