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
