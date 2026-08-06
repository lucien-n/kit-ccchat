import { uploadAttachmentQuery } from "@motus/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { rateLimit } from "../../ratelimit.js";
import { validate } from "../../validate.js";
import * as attachmentsController from "./attachments.controller.js";

const router = new Hono<Env>()
  .get("/:id", attachmentsController.download)
  .post(
    "/",
    requireAuth,
    rateLimit({ limit: 30, windowMs: 60_000 }),
    validate("query", uploadAttachmentQuery),
    attachmentsController.upload,
  );

export default router;
