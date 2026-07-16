import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from '../env.js';
import * as schema from './schema.js';

mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(join(DATA_DIR, 'ccchat.sqlite'));
sqlite.pragma('journal_mode = WAL'); // better concurrency for many chatters
sqlite.pragma('foreign_keys = ON');

/** Idempotent schema creation. We use raw DDL at boot instead of a separate
 *  migration-generation step so the server just runs — no build tooling needed
 *  to stand up a fresh instance. Drizzle is still used for all queries. */
export function migrate() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at INTEGER NOT NULL,
      muted_until INTEGER,
      banned INTEGER NOT NULL DEFAULT 0,
      avatar_version INTEGER
    );

    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 1,
      uses INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      edited_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages (channel_id, created_at);

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channel_reads (
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      last_read_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  addColumn('users', 'avatar_version', 'INTEGER');
}

/** Add a column to an existing table if it isn't already present (SQLite has no
 *  ADD COLUMN IF NOT EXISTS). */
function addColumn(table: string, column: string, type: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export const db = drizzle(sqlite, { schema });
export { schema };

/** Release the file handle. Only tests need this: Windows refuses to unlink an
 *  open SQLite file, so a temp database can't be cleaned up without it. */
export function closeDb() {
  sqlite.close();
}
