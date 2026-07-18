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
  ({ token } = await claim(app, "owner"));
});
afterAll(cleanup);

describe("register", () => {
  it("needs a valid invite", async () => {
    expect((await register(app, "made-up-code", uniq())).status).toBe(400);
    expect(
      (
        await post(app, "/api/auth/register", {
          username: uniq(),
          password: "joinpass123",
        })
      ).status,
    ).toBe(400);
  });

  it("enforces the username rules", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0 });
    for (const bad of ["a", "has spaces", "UPPER!", "x".repeat(25), "sym$bol"]) {
      expect((await register(app, invite.code, bad)).status, `should reject ${bad}`).toBe(
        400,
      );
    }
  });

  it("enforces a minimum password length", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0 });
    const res = await post(app, "/api/auth/register", {
      inviteCode: invite.code,
      username: uniq(),
      password: "short",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate username", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0 });
    const name = uniq();
    expect((await register(app, invite.code, name)).status).toBe(200);
    expect((await register(app, invite.code, name)).status).toBe(409);
  });

  it("does not burn a use when the username is taken", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 5 });
    const name = uniq();
    await register(app, invite.code, name);
    await register(app, invite.code, name); // rejected: 409

    const { invites } = await get(app, "/api/invites", token).then(json);
    expect(invites.find((i: any) => i.code === invite.code).uses).toBe(1);
  });

  it("joins as a member, never as an admin", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0 });
    const body = await register(app, invite.code, uniq()).then(json);
    expect(body.user.isAdmin).toBe(false);
    expect(body.user.isOwner).toBe(false);
  });
});

describe("login", () => {
  it("accepts the right password and rejects the wrong one", async () => {
    expect(
      (
        await post(app, "/api/auth/login", {
          username: "owner",
          password: "ownerpass123",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await post(app, "/api/auth/login", {
          username: "owner",
          password: "wrongpass123",
        })
      ).status,
    ).toBe(401);
  });

  it("does not leak whether a username exists", async () => {
    const missing = await post(app, "/api/auth/login", {
      username: "ghost",
      password: "whatever123",
    });
    const wrong = await post(app, "/api/auth/login", {
      username: "owner",
      password: "whatever123",
    });
    expect(missing.status).toBe(wrong.status);
    expect(await json(missing)).toEqual(await json(wrong));
  });
});

describe("sessions", () => {
  it("resolves a token to the right user", async () => {
    const { user } = await get(app, "/api/auth/me", token).then(json);
    expect(user.username).toBe("owner");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejects a garbage token", async () => {
    expect((await get(app, "/api/auth/me", "not-a-token")).status).toBe(401);
    expect((await get(app, "/api/auth/me")).status).toBe(401);
  });

  it("invalidates the token on logout", async () => {
    const { token: t } = await post(app, "/api/auth/login", {
      username: "owner",
      password: "ownerpass123",
    }).then(json);

    expect((await get(app, "/api/auth/me", t)).status).toBe(200);
    await post(app, "/api/auth/logout", undefined, t);
    expect((await get(app, "/api/auth/me", t)).status).toBe(401);
  });

  it("locks out a banned user", async () => {
    const { invite } = await mkInvite(app, token, { maxUses: 0 });
    const name = uniq();
    const member = await register(app, invite.code, name).then(json);

    await post(app, `/api/moderation/${member.user.id}/ban`, undefined, token);

    expect((await get(app, "/api/auth/me", member.token)).status).toBe(401);
    expect(
      (await post(app, "/api/auth/login", { username: name, password: "joinpass123" }))
        .status,
    ).toBe(403);
  });
});
