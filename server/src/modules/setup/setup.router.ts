import { setupBody } from "@motus/shared";
import { Hono } from "hono";
import type { Env } from "../../auth.js";
import { rateLimit } from "../../ratelimit.js";
import { validate } from "../../validate.js";
import * as setupController from "./setup.controller.js";

const router = new Hono<Env>().post(
  "/",
  rateLimit({ limit: 5, windowMs: 60_000 }),
  validate("json", setupBody),
  setupController.claim,
);

export default router;
