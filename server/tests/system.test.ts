import { Permission } from "@ccchat/shared";
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
