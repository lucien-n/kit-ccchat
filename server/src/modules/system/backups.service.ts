import type { BackupItem, BackupStatus } from "@motus/shared";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { backupTo } from "../../db/index.js";
import { BACKUPS_DIR, BACKUP_INTERVAL_HOURS, BACKUP_RETENTION } from "../../env.js";
import { httpError } from "../../http/errors.js";

/** Only files this feature writes are ever listed, downloaded, or deleted, so a
 *  crafted `:name` can't reach the live database or anything else on disk. */
const NAME_RE = /^motus-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.sqlite$/;

const INTERVAL_MS = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000;

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `_${p(d.getUTCHours())}-${p(d.getUTCMinutes())}-${p(d.getUTCSeconds())}`
  );
}

async function ensureDir() {
  await mkdir(BACKUPS_DIR, { recursive: true });
}

export async function listBackups(): Promise<BackupItem[]> {
  let names: string[];
  try {
    names = await readdir(BACKUPS_DIR);
  } catch {
    return [];
  }
  const items = await Promise.all(
    names
      .filter((name) => NAME_RE.test(name))
      .map(async (name) => {
        const info = await stat(join(BACKUPS_DIR, name));
        return { name, sizeBytes: info.size, createdAt: Math.round(info.mtimeMs) };
      }),
  );
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

// Coalesce concurrent requests (a manual click landing on a scheduled tick) onto
// one snapshot rather than racing two writes.
let inFlight: Promise<BackupItem> | null = null;

export function createBackup(): Promise<BackupItem> {
  return (inFlight ??= run().finally(() => (inFlight = null)));
}

async function run(): Promise<BackupItem> {
  await ensureDir();
  const name = `motus-${stamp(new Date())}.sqlite`;
  await backupTo(join(BACKUPS_DIR, name));
  await prune();
  const info = await stat(join(BACKUPS_DIR, name));
  return { name, sizeBytes: info.size, createdAt: Math.round(info.mtimeMs) };
}

async function prune() {
  if (BACKUP_RETENTION <= 0) return;
  const items = await listBackups();
  for (const item of items.slice(BACKUP_RETENTION)) {
    await unlink(join(BACKUPS_DIR, item.name)).catch(() => {});
  }
}

/** Resolve a validated backup name to its absolute path, refusing anything that
 *  isn't a plain backup filename sitting directly in BACKUPS_DIR. */
export function backupPath(name: string): string {
  const full = resolve(BACKUPS_DIR, name);
  if (!NAME_RE.test(name) || full !== join(BACKUPS_DIR, name)) {
    httpError(400, "invalid backup name");
  }
  return full;
}

export async function deleteBackup(name: string) {
  const path = backupPath(name);
  try {
    await unlink(path);
  } catch {
    httpError(404, "not found");
  }
}

export async function backupStatus(): Promise<BackupStatus> {
  const items = await listBackups();
  const lastBackupAt = items[0]?.createdAt ?? null;
  return {
    intervalHours: BACKUP_INTERVAL_HOURS,
    retention: BACKUP_RETENTION,
    totalBytes: items.reduce((total, item) => total + item.sizeBytes, 0),
    lastBackupAt,
    nextBackupAt: INTERVAL_MS > 0 ? (lastBackupAt ?? Date.now()) + INTERVAL_MS : null,
    items,
  };
}

let scheduled = false;

/** Snapshot on a fixed interval, plus a catch-up on boot so a box that restarts
 *  more often than the interval still gets its backups. */
export function startBackupScheduler() {
  if (scheduled || INTERVAL_MS <= 0) return;
  scheduled = true;

  void (async () => {
    try {
      const items = await listBackups();
      const last = items[0]?.createdAt ?? 0;
      if (Date.now() - last >= INTERVAL_MS) await createBackup();
    } catch (e) {
      console.error("[backups] initial backup failed", e);
    }
    const timer = setInterval(() => {
      createBackup().catch((e) => console.error("[backups] scheduled backup failed", e));
    }, INTERVAL_MS);
    timer.unref?.(); // never hold the process (or a test run) open
  })();
}
