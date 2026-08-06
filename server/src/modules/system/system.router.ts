import { Hono } from "hono";
import { requireAuth, requireOwner, type Env } from "../../auth.js";
import * as systemController from "./system.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth, requireOwner)
  .get("/", systemController.stats)
  .post("/backups", systemController.createBackup)
  .delete("/backups/:name", systemController.deleteBackup)
  .get("/backups/:name/download", systemController.downloadBackup);

export default router;
