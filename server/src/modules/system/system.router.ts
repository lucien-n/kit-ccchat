import { Hono } from "hono";
import { requireAuth, requireOwner, type Env } from "../../auth.js";
import * as systemController from "./system.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth, requireOwner)
  .get("/", systemController.stats);

export default router;
