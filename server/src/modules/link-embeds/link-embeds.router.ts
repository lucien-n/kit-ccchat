import { Hono } from "hono";
import type { Env } from "../../auth.js";
import * as linkEmbedsController from "./link-embeds.controller.js";

// Unauthenticated by design: reachable only by unguessable embed id (see controller).
const router = new Hono<Env>().get("/:id/image", linkEmbedsController.image);

export default router;
