import type { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  boot,
  claim,
  cleanup,
  get,
  json,
  mkInvite,
  patch,
  post,
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let owner: string;
let inviteCode: string;

beforeAll(async () => {
  app = await boot();
  ({ token: owner } = await claim(app, "owner"));
  ({
    invite: { code: inviteCode },
  } = await mkInvite(app, owner, { maxUses: 0 }));
});
afterAll(cleanup);

const login = (username: string, password: string) =>
  post(app, "/api/auth/login", { username, password });

const changePassword = (token: string, currentPassword: string, newPassword: string) =>
  post(app, "/api/users/me/password", { currentPassword, newPassword }, token);

async function newMember() {
  const username = uniq();
  const { token, user } = await json<{ token: string; user: { id: string } }>(
    await register(app, inviteCode, username),
  );
  return { username, token, id: user.id, password: "joinpass123" };
}

describe("changing your own password", () => {
  it("retires the old password and accepts the new one", async () => {
    const m = await newMember();
    expect((await changePassword(m.token, m.password, "brandnewpass1")).status).toBe(200);

    expect((await login(m.username, m.password)).status).toBe(401);
    expect((await login(m.username, "brandnewpass1")).status).toBe(200);
  });

  it("refuses without the current password", async () => {
    const m = await newMember();
    const res = await changePassword(m.token, "not-my-password", "brandnewpass1");
    expect(res.status).toBe(403);

    // The wrong guess must not have changed anything.
    expect((await login(m.username, m.password)).status).toBe(200);
  });

  it("holds the new password to the same length rule as registration", async () => {
    const m = await newMember();
    expect((await changePassword(m.token, m.password, "short")).status).toBe(400);
    expect((await login(m.username, m.password)).status).toBe(200);
  });
});

describe("editing your own profile", () => {
  it("renames you everywhere the roster is read from", async () => {
    const m = await newMember();
    const res = await patch(app, "/api/users/me", { displayName: "Renamed" }, m.token);
    expect(res.status).toBe(200);
    expect((await json<any>(res)).user.displayName).toBe("Renamed");

    const { members } = await json<any>(await get(app, "/api/users", owner));
    expect(members.find((x: any) => x.id === m.id).displayName).toBe("Renamed");
  });

  it("rejects a blank display name rather than leaving you nameless", async () => {
    const m = await newMember();
    expect(
      (await patch(app, "/api/users/me", { displayName: "  " }, m.token)).status,
    ).toBe(400);
  });
});
