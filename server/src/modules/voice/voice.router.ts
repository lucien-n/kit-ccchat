import { voiceTokenBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as voiceController from "./voice.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth)
  .get("/config", voiceController.config)
  .post("/token", validate("json", voiceTokenBody), voiceController.token);

export default router;
