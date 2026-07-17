import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate as runMigrations } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_DIR } from "../env.js";
import * as schema from "./schema";

// From this file, not the cwd: dev and the image start it from different places.
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(join(DATA_DIR, "ccchat.sqlite"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

/** Databases created before migrations existed already have the tables but no
 *  journal, so 0000 would abort on CREATE TABLE. Record it as applied instead of
 *  running it. Drizzle skips any migration not newer than the last recorded
 *  folderMillis, so later ones still run. */
function baselineLegacyDb() {
  const exists = (name: string) =>
    sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);

  if (!exists("users") || exists("__drizzle_migrations")) return;

  const [baseline] = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
  if (!baseline) return;

  sqlite.exec(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at numeric
  )`);
  sqlite
    .prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)")
    .run(baseline.hash, baseline.folderMillis);
}

export function migrate() {
  baselineLegacyDb();
  runMigrations(db, { migrationsFolder: MIGRATIONS_DIR });
}

/** Windows refuses to unlink an open SQLite file, so tests need the handle back. */
export function closeDb() {
  sqlite.close();
}
