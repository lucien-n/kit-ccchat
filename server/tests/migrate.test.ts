import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

// This suite drives raw SQLite files rather than the app: the thing under test
// is what happens to a database on boot, including one that predates migrations.
const dirs: string[] = [];
const freshDir = () => {
  const d = mkdtempSync(join(tmpdir(), "ccchat-mig-"));
  dirs.push(d);
  return d;
};

beforeAll(() => {
  process.env.NODE_ENV = "test";
});

afterAll(() => {
  for (const d of dirs) {
    try {
      rmSync(d, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* the OS will get it */
    }
  }
});

/** Boot the db module against `dir` in a module registry of its own, since the
 *  connection is a module-scope singleton bound to DATA_DIR at import time.
 *  resetModules is what makes the next import re-evaluate against the new dir. */
async function bootAt(dir: string) {
  vi.resetModules();
  process.env.DATA_DIR = dir;
  const mod = await import("../src/db/index.js");
  mod.migrate();
  return mod;
}

const tables = (file: string): string[] => {
  const raw = new Database(file, { readonly: true });
  const rows = raw
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as Array<{ name: string }>;
  raw.close();
  return rows.map((r) => r.name);
};

describe("a fresh database", () => {
  it("gets every table the app queries", async () => {
    const dir = freshDir();
    const { closeDb } = await bootAt(dir);
    closeDb();

    const names = tables(join(dir, "ccchat.sqlite"));
    for (const t of [
      "users",
      "invites",
      "channels",
      "messages",
      "sessions",
      "channel_reads",
      "settings",
    ]) {
      expect(names, `missing table ${t}`).toContain(t);
    }
  });

  it("keeps the index message history depends on", async () => {
    const dir = freshDir();
    const { closeDb } = await bootAt(dir);
    closeDb();

    const raw = new Database(join(dir, "ccchat.sqlite"), { readonly: true });
    const idx = raw
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages'",
      )
      .all() as Array<{ name: string }>;
    raw.close();

    // It lived only in the old hand-written DDL. Regenerating without declaring
    // it in schema.ts would have silently dropped it.
    expect(idx.map((i) => i.name)).toContain("idx_messages_channel");
  });

  it("is idempotent: booting twice is not an error", async () => {
    const dir = freshDir();
    const first = await bootAt(dir);
    first.closeDb();

    const second = await bootAt(dir);
    expect(() => second.migrate()).not.toThrow();
    second.closeDb();
  });
});

describe("a database that predates migrations", () => {
  /** Exactly what the old hand-written DDL produced, with a user in it. */
  function legacyDb(dir: string) {
    const raw = new Database(join(dir, "ccchat.sqlite"));
    raw.pragma("journal_mode = WAL");
    raw.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
        created_at INTEGER NOT NULL, muted_until INTEGER,
        banned INTEGER NOT NULL DEFAULT 0, avatar_version INTEGER
      );
      CREATE TABLE IF NOT EXISTS invites (
        code TEXT PRIMARY KEY, created_by TEXT NOT NULL, created_at INTEGER NOT NULL,
        max_uses INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'text',
        position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, author_id TEXT NOT NULL,
        content TEXT NOT NULL, created_at INTEGER NOT NULL, edited_at INTEGER,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages (channel_id, created_at);
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS channel_reads (
        user_id TEXT NOT NULL, channel_id TEXT NOT NULL, last_read_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, channel_id)
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    raw
      .prepare(
        `INSERT INTO users (id, username, display_name, password_hash, role, created_at, banned)
         VALUES ('u1', 'lucien', 'Lucien', 'hash', 'owner', 1, 0)`,
      )
      .run();
    raw
      .prepare(
        `INSERT INTO settings (key, value) VALUES ('communityName', 'Real Community')`,
      )
      .run();
    raw.close();
  }

  // drizzle-kit emits plain CREATE TABLE, which aborts on a database that
  // already has the tables. baselineLegacyDb records 0000 instead of running it.
  it('boots instead of dying on "table already exists"', async () => {
    const dir = freshDir();
    legacyDb(dir);

    const { closeDb } = await bootAt(dir);
    closeDb();
  });

  it("does not touch the data that was already there", async () => {
    const dir = freshDir();
    legacyDb(dir);

    const { db, closeDb } = await bootAt(dir);
    const { users, settings } = await import("../src/db/schema.js");

    const found = db.select().from(users).all();
    expect(found).toHaveLength(1);
    expect(found[0]!.username).toBe("lucien");
    expect(found[0]!.role).toBe("owner");

    const cfg = db.select().from(settings).all();
    expect(cfg[0]!.value).toBe("Real Community");
    closeDb();
  });

  it("records the baseline so it is not applied twice", async () => {
    const dir = freshDir();
    legacyDb(dir);

    const { closeDb } = await bootAt(dir);
    closeDb();

    const raw = new Database(join(dir, "ccchat.sqlite"), { readonly: true });
    const applied = raw
      .prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations")
      .get() as { n: number };
    raw.close();
    expect(applied.n).toBeGreaterThan(0);
  });
});
