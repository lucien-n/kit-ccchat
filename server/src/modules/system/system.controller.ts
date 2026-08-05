import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { AppContext } from "../../http/context.js";
import { httpError } from "../../http/errors.js";
import * as backupsService from "./backups.service.js";
import * as systemService from "./system.service.js";

export async function stats(c: AppContext) {
  return c.json({ stats: await systemService.collectSystemStats() });
}

export async function createBackup(c: AppContext) {
  return c.json({ backup: await backupsService.createBackup() });
}

export async function deleteBackup(c: AppContext<"/backups/:name">) {
  await backupsService.deleteBackup(c.req.param("name"));
  return c.json({ ok: true });
}

export async function downloadBackup(c: AppContext<"/backups/:name/download">) {
  const name = c.req.param("name");
  const path = backupsService.backupPath(name);
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = new Uint8Array(await readFile(path));
  } catch {
    return httpError(404, "not found");
  }
  c.header("Content-Type", "application/octet-stream");
  c.header("Content-Disposition", `attachment; filename="${basename(path)}"`);
  c.header("X-Content-Type-Options", "nosniff");
  return c.body(bytes);
}
