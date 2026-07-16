import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import {
  boot,
  claim,
  cleanup,
  get,
  json,
  mkInvite,
  post,
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let token: string;

beforeAll(async () => {
  app = await boot();
  ({ token } = await claim(app));
});
afterAll(cleanup);

describe("single-use invites", () => {
  it("lets exactly one person through", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 1, expiresInHours: 24 });
    expect(invite.maxUses).toBe(1);
    expect(invite.active).toBe(true);

    expect((await register(app, invite.code, uniq())).status).toBe(200);
    // The point of the whole feature: the second person is turned away.
    expect((await register(app, invite.code, uniq())).status).toBe(400);
  });

  it("reports itself used up afterwards", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 1 });
    await register(app, invite.code, uniq());

    const { invites } = await get(app, "/api/invites", token).then(json);
    const mine = invites.find((i: any) => i.code === invite.code);
    expect(mine.status).toBe("used up");
    expect(mine.active).toBe(false);
    expect(mine.uses).toBe(1);
  });
});

describe("multi-use invites", () => {
  it("admits exactly maxUses people", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 3, expiresInHours: 48 });
    for (let i = 0; i < 3; i++) {
      expect((await register(app, invite.code, uniq())).status).toBe(200);
    }
    expect((await register(app, invite.code, uniq())).status).toBe(400);
  });
});

describe("revoking", () => {
  it("kills a leaked link", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0 });
    expect((await register(app, invite.code, uniq())).status).toBe(200);

    const revoked = await post(
      app,
      `/api/invites/${invite.code}/revoke`,
      undefined,
      token,
    ).then(json);
    expect(revoked.invite.revoked).toBe(true);
    expect(revoked.invite.active).toBe(false);
    expect(revoked.invite.status).toBe("revoked");

    expect((await register(app, invite.code, uniq())).status).toBe(400);
  });

  it("keeps the row as an audit trail", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0 });
    await register(app, invite.code, uniq());
    await post(app, `/api/invites/${invite.code}/revoke`, undefined, token);

    const { invites } = await get(app, "/api/invites", token).then(json);
    const mine = invites.find((i: any) => i.code === invite.code);
    expect(mine).toBeTruthy();
    expect(mine.uses).toBe(1);
  });

  it("404s on a code that never existed", async () => {
    const res = await post(app, "/api/invites/not-a-real-code/revoke", undefined, token);
    expect(res.status).toBe(404);
  });
});

describe("expiry", () => {
  it("rejects an expired code", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0, expiresInHours: 1 });
    // Reach past the API to age it, rather than sleeping an hour.
    const { db } = await import("../src/db/index.js");
    const { invites } = await import("../src/db/schema.js");
    const { eq } = await import("drizzle-orm");
    db.update(invites)
      .set({ expiresAt: Date.now() - 1000 })
      .where(eq(invites.code, invite.code))
      .run();

    expect((await register(app, invite.code, uniq())).status).toBe(400);

    const list = await get(app, "/api/invites", token).then(json);
    expect(list.invites.find((i: any) => i.code === invite.code).status).toBe("expired");
  });

  it("ignores a negative expiry rather than minting a dead link", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0, expiresInHours: -1 });
    expect(invite.expiresAt).toBeNull();
    expect((await register(app, invite.code, uniq())).status).toBe(200);
  });
});

describe("permissions", () => {
  it("does not let a plain member mint or list invites", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 1 });
    const member = await register(app, invite.code, uniq()).then(json);

    expect((await post(app, "/api/invites", { maxUses: 0 }, member.token)).status).toBe(
      403,
    );
    expect((await get(app, "/api/invites", member.token)).status).toBe(403);
  });

  it("rejects an unauthenticated caller", async () => {
    expect((await get(app, "/api/invites")).status).toBe(401);
  });
});
