import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate as runMigrations } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_DIR } from "../env.js";
import * as schema from "./schema";

// Resolve relative to this file so it works in development and production.
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(join(DATA_DIR, "ccchat.sqlite"));

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function migrate() {
  runMigrations(db, {
    migrationsFolder: MIGRATIONS_DIR,
  });
}

export function closeDb() {
  sqlite.close();
}
