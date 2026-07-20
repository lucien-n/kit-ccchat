import { setupBody } from "@ccchat/shared";
import { Hono } from "hono";
import type { Env } from "../../auth.js";
import { rateLimit } from "../../ratelimit.js";
import { validate } from "../../validate.js";
import * as setupController from "./setup.controller.js";

const router = new Hono<Env>();

// Open to the internet on a fresh box until someone claims it. Limited so that
// window can't be ground on, and so the 409 afterwards is cheap to serve.
router.post(
  "/",
  rateLimit({ limit: 5, windowMs: 60_000 }),
  validate("json", setupBody),
  setupController.claim,
);

export default router;
