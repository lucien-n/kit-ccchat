import { updateSoundBody, uploadSoundBody } from "@motus/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { rateLimit } from "../../ratelimit.js";
import { validate } from "../../validate.js";
import * as soundboardController from "./soundboard.controller.js";

const router = new Hono<Env>()
  .get("/", requireAuth, soundboardController.list)
  .get("/:id", soundboardController.get)
  .post(
    "/",
    requireAuth,
    rateLimit({ limit: 20, windowMs: 60_000 }),
    validate("json", uploadSoundBody),
    soundboardController.upload,
  )
  .patch(
    "/:id",
    requireAuth,
    validate("json", updateSoundBody),
    soundboardController.update,
  )
  .delete("/:id", requireAuth, soundboardController.remove);

export default router;
