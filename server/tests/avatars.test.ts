import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { boot, claim, cleanup, json } from "./harness.js";

let app: Hono<any>;
let token: string;
let userId: string;

beforeAll(async () => {
  app = await boot();
  ({ token } = await claim(app));
  ({
    user: { id: userId },
  } = await json(
    await app.request("/api/auth/me", {
      headers: { authorization: `Bearer ${token}` },
    }),
  ));
});

afterAll(cleanup);

// A 1x1 png, small enough to inline.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("avatar upload and fetch", () => {
  it("round-trips an uploaded avatar", async () => {
    const res = await app.request("/api/users/me/avatar", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ image: PNG }),
    });
    expect(res.status).toBe(200);

    const got = await app.request(`/api/users/${userId}/avatar`);
    expect(got.status).toBe(200);
    expect(got.headers.get("content-type")).toBe("image/png");
  });

  it("404s for a user with no avatar", async () => {
    const res = await app.request("/api/users/nobody-here/avatar");
    expect(res.status).toBe(404);
  });

  it("serves avatars with nosniff", async () => {
    const res = await app.request(`/api/users/${userId}/avatar`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  /** The data: prefix is uploader-supplied, so it proves nothing about the
   *  bytes. Anything stored here is served back from our own origin - the one
   *  the session token lives on. */
  it("rejects non-image bytes wearing an image/png prefix", async () => {
    const html = Buffer.from("<script>alert(document.cookie)</script>").toString(
      "base64",
    );
    const res = await app.request("/api/users/me/avatar", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ image: `data:image/png;base64,${html}` }),
    });
    expect(res.status).toBe(400);
  });
});

/** The id lands in a filesystem path, and this route is deliberately public, so
 *  a traversal here is an unauthenticated read of anything the process can see -
 *  including ccchat.sqlite, which holds every password hash and session token. */
describe("avatar path traversal", () => {
  const secret = "TOP-SECRET-CONTENTS";
  const escaped = "ESCAPED-THE-DATA-DIR";

  beforeAll(() => {
    // One level above AVATAR_DIR (= DATA_DIR/avatars) ...
    writeFileSync(join(process.env.DATA_DIR!, "secret.txt"), secret);
    // ... and two, i.e. outside DATA_DIR entirely. Without a target that really
    // exists up there, an "escape the data dir" case 404s on a broken
    // implementation too and proves nothing.
    writeFileSync(join(process.env.DATA_DIR!, "..", "ccchat-escaped.txt"), escaped);
  });

  const attacks = [
    ["encoded slash", "..%2Fsecret.txt"],
    ["fully encoded dots and slash", "%2e%2e%2fsecret.txt"],
    ["the database itself", "..%2Fccchat.sqlite"],
    ["escaping the data dir", "..%2F..%2Fccchat-escaped.txt"],
    ["absolute-ish nesting", "avatars%2F..%2F..%2Fsecret.txt"],
  ] as const;

  for (const [name, id] of attacks) {
    it(`refuses ${name}`, async () => {
      const res = await app.request(`/api/users/${id}/avatar`);
      const body = await res.text();
      expect(res.status).toBe(404);
      expect(body).not.toContain(secret);
      expect(body).not.toContain(escaped);
    });
  }

  it("does not leak the database", async () => {
    const res = await app.request("/api/users/..%2Fccchat.sqlite/avatar");
    expect(await res.text()).not.toContain("SQLite format");
  });
});
