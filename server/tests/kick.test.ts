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
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let owner: string;

beforeAll(async () => {
  app = await boot();
  ({ token: owner } = await claim(app, "owner"));
});
afterAll(cleanup);

const login = (username: string, password = "joinpass123") =>
  post(app, "/api/auth/login", { username, password });

/** A fresh member plus the token they registered with. */
async function newMember() {
  const { invite } = await mkInvite(app, owner, { maxUses: 0 });
  const username = uniq();
  const { token, user } = await json<{ token: string; user: { id: string } }>(
    await register(app, invite.code, username),
  );
  return { username, token, id: user.id };
}

describe("kick", () => {
  it("ends the session and blocks logging back in", async () => {
    const member = await newMember();
    expect((await get(app, "/api/auth/me", member.token)).status).toBe(200);

    expect((await post(app, `/api/moderation/${member.id}/kick`, {}, owner)).status).toBe(
      200,
    );

    expect((await get(app, "/api/auth/me", member.token)).status).toBe(401);
    expect((await login(member.username)).status).toBe(403);
  });

  it("lets a kicked member back in by redeeming a fresh invite", async () => {
    const member = await newMember();
    await post(app, `/api/moderation/${member.id}/kick`, {}, owner);

    const { invite } = await mkInvite(app, owner, { maxUses: 0 });
    const res = await register(app, invite.code, member.username);
    expect(res.status).toBe(200);

    // Same account, not a second one: the id survives the round trip.
    const { user } = await json<{ user: { id: string } }>(res);
    expect(user.id).toBe(member.id);
    expect((await login(member.username)).status).toBe(200);
  });

  it("will not let an invite holder take over a kicked name with a new password", async () => {
    const member = await newMember();
    await post(app, `/api/moderation/${member.id}/kick`, {}, owner);

    const { invite } = await mkInvite(app, owner, { maxUses: 0 });
    const res = await post(app, "/api/auth/register", {
      inviteCode: invite.code,
      username: member.username,
      password: "someoneelses9999",
    });
    expect(res.status).toBe(409);
  });

  it("still rejects a taken username that was never kicked", async () => {
    const member = await newMember();
    const { invite } = await mkInvite(app, owner, { maxUses: 0 });
    expect((await register(app, invite.code, member.username)).status).toBe(409);
  });

  it("counts the invite when a kicked member rejoins", async () => {
    const member = await newMember();
    await post(app, `/api/moderation/${member.id}/kick`, {}, owner);

    const { invite } = await mkInvite(app, owner, { maxUses: 1 });
    expect((await register(app, invite.code, member.username)).status).toBe(200);

    // The invite was single-use, so a second redemption must fail.
    const other = uniq();
    expect((await register(app, invite.code, other)).status).toBe(400);
  });
});
