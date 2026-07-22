import { uploadImageBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { rateLimit } from "../../ratelimit.js";
import { validate } from "../../validate.js";
import * as imagesController from "./images.controller.js";

const router = new Hono<Env>()
  .get("/:id", imagesController.get)
  .post(
    "/",
    requireAuth,
    rateLimit({ limit: 30, windowMs: 60_000 }),
    validate("json", uploadImageBody),
    imagesController.upload,
  );

export default router;
