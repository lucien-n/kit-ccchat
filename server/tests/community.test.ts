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
let member: string;

// Smallest thing that survives the magic-byte sniff: a real 1x1 PNG.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const iconUrl = "/api/settings/icon";
const setIcon = (image: string, token?: string) => post(app, iconUrl, { image }, token);
const del = (token?: string) =>
  app.request(iconUrl, {
    method: "DELETE",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

beforeAll(async () => {
  app = await boot();
  ({ token: owner } = await claim(app, "owner"));
  const { invite } = await mkInvite(app, owner, { maxUses: 0 });
  ({ token: member } = await json(await register(app, invite.code, uniq())));
});
afterAll(cleanup);

describe("community icon", () => {
  it("404s before one is set, and reports no version", async () => {
    expect((await get(app, iconUrl)).status).toBe(404);
    expect((await json(await get(app, "/api/info"))).iconVersion).toBeNull();
  });

  it("only an owner or admin may set it", async () => {
    expect((await setIcon(PNG)).status).toBe(401);
    expect((await setIcon(PNG, member)).status).toBe(403);
  });

  it("rejects anything that is not a real image", async () => {
    expect((await setIcon("not-a-data-url", owner)).status).toBe(400);
    // Declares PNG, but the bytes are plain text.
    expect((await setIcon("data:image/png;base64,aGVsbG8gd29ybGQ=", owner)).status).toBe(
      400,
    );
  });

  it("is served publicly once set, and surfaces its version", async () => {
    const res = await setIcon(PNG, owner);
    expect(res.status).toBe(200);
    const { iconVersion } = await json<{ iconVersion: number }>(res);
    expect(iconVersion).toBeGreaterThan(0);

    // No token: an <img> tag and the favicon cannot send one.
    const img = await get(app, iconUrl);
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(img.headers.get("x-content-type-options")).toBe("nosniff");

    expect((await json(await get(app, "/api/info"))).iconVersion).toBe(iconVersion);
  });

  it("removes it again, owner only", async () => {
    await setIcon(PNG, owner);

    expect((await del(member)).status).toBe(403);
    expect((await del(owner)).status).toBe(200);

    expect((await get(app, iconUrl)).status).toBe(404);
    expect((await json(await get(app, "/api/info"))).iconVersion).toBeNull();
  });
});

describe("community name", () => {
  it("renames for everyone, including the sign-in screen", async () => {
    const res = await patch(app, "/api/settings", { communityName: "Renamed HQ" }, owner);
    expect(res.status).toBe(200);
    expect((await json<{ communityName: string }>(res)).communityName).toBe("Renamed HQ");

    // /api/info answers before sign-in, so this is what a stranger sees.
    expect((await json(await get(app, "/api/info"))).name).toBe("Renamed HQ");
  });

  it("is owner-only, like the icon", async () => {
    const res = await patch(app, "/api/settings", { communityName: "Nope" }, member);
    expect(res.status).toBe(403);
    expect((await json(await get(app, "/api/info"))).name).not.toBe("Nope");
  });

  it("rejects a blank name", async () => {
    expect((await patch(app, "/api/settings", { communityName: "" }, owner)).status).toBe(
      400,
    );
  });
});
