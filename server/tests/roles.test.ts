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
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let ownerToken: string;
let inviteCode: string;

beforeAll(async () => {
  app = await boot();
  const claimed = await claim(app, "owner");
  ownerToken = claimed.token;
  ({
    invite: { code: inviteCode },
  } = await mkInvite(app, ownerToken, { maxUses: 0 }));
});
afterAll(cleanup);

async function createRole(token: string, body: Record<string, unknown>) {
  return post(app, "/api/roles", body, token);
}

describe("role management", () => {
  it("lets an admin create a role and lists it", async () => {
    const res = await createRole(ownerToken, {
      name: "Moderators",
      color: "#e91e63",
      permission: Permission.Admin,
    });
    expect(res.status).toBe(200);
    const { roles } = await get(app, "/api/roles", ownerToken).then(json);
    expect(roles.some((r: any) => r.name === "Moderators")).toBe(true);
  });

  it("forbids a non-admin from creating a role", async () => {
    const { token } = await register(app, inviteCode, uniq()).then(json);
    const res = await createRole(token, {
      name: "Nope",
      color: null,
      permission: Permission.Member,
    });
    expect(res.status).toBe(403);
  });

  it("assigning an admin role makes the member an admin, and its color shows", async () => {
    const { user, token } = await register(app, inviteCode, uniq()).then(json);
    expect(user.isAdmin).toBe(false);

    const { role } = await createRole(ownerToken, {
      name: "Staff",
      color: "#00bcd4",
      permission: Permission.Admin,
    }).then(json);

    const assign = await app.request(`/api/roles/members/${user.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ roleIds: [role.id] }),
    });
    expect(assign.status).toBe(200);

    // Profile reflects the role + the member is now an admin with the role color.
    const profile = await get(app, `/api/users/${user.id}`, token).then(json);
    expect(profile.user.isAdmin).toBe(true);
    expect(profile.user.color).toBe("#00bcd4");
    expect(profile.roles.map((r: any) => r.id)).toContain(role.id);

    // And that admin power is real: they can now create a role themselves.
    expect(
      (
        await createRole(token, {
          name: uniq(),
          color: null,
          permission: Permission.Member,
        })
      ).status,
    ).toBe(200);
  });

  it("a member-permission role is cosmetic: color only, no admin", async () => {
    const { user, token } = await register(app, inviteCode, uniq()).then(json);
    const { role } = await createRole(ownerToken, {
      name: "Cyan",
      color: "#18ffff",
      permission: Permission.Member,
    }).then(json);

    await app.request(`/api/roles/members/${user.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ roleIds: [role.id] }),
    });

    const profile = await get(app, `/api/users/${user.id}`, token).then(json);
    expect(profile.user.color).toBe("#18ffff");
    expect(profile.user.isAdmin).toBe(false);
  });

  it("an admin cannot rewrite the owner's roles", async () => {
    // Promote a fresh member to admin.
    const { user: admin, token: adminToken } = await register(
      app,
      inviteCode,
      uniq(),
    ).then(json);
    const { role } = await createRole(ownerToken, {
      name: uniq(),
      color: null,
      permission: Permission.Admin,
    }).then(json);
    await app.request(`/api/roles/members/${admin.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ roleIds: [role.id] }),
    });

    const owner = await get(app, "/api/auth/me", ownerToken).then(json);
    const res = await app.request(`/api/roles/members/${owner.user.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ roleIds: [role.id] }),
    });
    expect(res.status).toBe(403);
  });

  it("the public roster is readable by any member; moderation view is not", async () => {
    const { token } = await register(app, inviteCode, uniq()).then(json);
    expect((await get(app, "/api/users", token)).status).toBe(200);
    expect((await get(app, "/api/moderation/members", token)).status).toBe(403);
  });
});
