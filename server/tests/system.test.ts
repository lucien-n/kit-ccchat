import { Permission } from "@motus/shared";
import type { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  boot,
  claim,
  cleanup,
  get,
  json,
  mkInvite,
  post,
  put,
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let ownerToken: string;
let inviteCode: string;

beforeAll(async () => {
  app = await boot();
  ownerToken = (await claim(app, "owner")).token;
  ({
    invite: { code: inviteCode },
  } = await mkInvite(app, ownerToken, { maxUses: 0 }));
});
afterAll(cleanup);

describe("system stats", () => {
  it("gives the owner a host snapshot", async () => {
    const res = await get(app, "/api/system", ownerToken);
    expect(res.status).toBe(200);
    const { stats } = await json<any>(res);

    expect(typeof stats.hostname).toBe("string");
    expect(stats.cpu.cores).toBeGreaterThan(0);
    expect(stats.cpu.loadAvg).toHaveLength(3);
    expect(stats.cpu.usagePct).toBeGreaterThanOrEqual(0);
    expect(stats.memory.totalBytes).toBeGreaterThan(0);
    expect(stats.memory.usedBytes).toBeLessThanOrEqual(stats.memory.totalBytes);
    expect(stats.disk.totalBytes).toBeGreaterThanOrEqual(0);
    expect(stats.app.rssBytes).toBeGreaterThan(0);
    expect(Array.isArray(stats.history)).toBe(true);
    expect(stats.sampleIntervalSec).toBeGreaterThan(0);
  });

  it("forbids an admin who is not the owner", async () => {
    const { user, token } = await register(app, inviteCode, uniq()).then(json);
    const { role } = await post(
      app,
      "/api/roles",
      { name: uniq(), color: null, permission: Permission.Admin },
      ownerToken,
    ).then(json);
    await put(app, `/api/roles/members/${user.id}`, { roleIds: [role.id] }, ownerToken);

    const me = await get(app, "/api/auth/me", token).then(json);
    expect(me.user.isAdmin).toBe(true); // really an admin...
    expect((await get(app, "/api/system", token)).status).toBe(403); // ...still not the owner
  });

  it("rejects an anonymous request", async () => {
    expect((await get(app, "/api/system")).status).toBe(401);
  });
});

describe("database backups", () => {
  it("creates, lists, downloads and deletes a snapshot", async () => {
    const created = await post(app, "/api/system/backups", undefined, ownerToken);
    expect(created.status).toBe(200);
    const { backup } = await json<any>(created);
    expect(backup.name).toMatch(/^motus-[\d_-]+\.sqlite$/);
    expect(backup.sizeBytes).toBeGreaterThan(0);

    const { stats } = await get(app, "/api/system", ownerToken).then(json);
    expect(stats.backups.items.some((b: any) => b.name === backup.name)).toBe(true);
    expect(stats.backups.totalBytes).toBeGreaterThanOrEqual(backup.sizeBytes);
    expect(stats.backups.lastBackupAt).toBeGreaterThan(0);

    const dl = await get(app, `/api/system/backups/${backup.name}/download`, ownerToken);
    expect(dl.status).toBe(200);
    expect((await dl.arrayBuffer()).byteLength).toBe(backup.sizeBytes);

    const del = await app.request(`/api/system/backups/${backup.name}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(del.status).toBe(200);

    const after = await get(app, "/api/system", ownerToken).then(json);
    expect(after.stats.backups.items.some((b: any) => b.name === backup.name)).toBe(false);
  });

  it("rejects a traversal-style backup name", async () => {
    const res = await get(
      app,
      "/api/system/backups/..%2F..%2Fmotus.sqlite/download",
      ownerToken,
    );
    expect(res.status).toBe(400);
  });

  it("forbids a non-owner from taking a backup", async () => {
    expect((await post(app, "/api/system/backups")).status).toBe(401);
  });
});
