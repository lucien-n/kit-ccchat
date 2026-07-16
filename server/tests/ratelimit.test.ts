import type { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, claim, cleanup, json, post } from "./harness.js";

let app: Hono<any>;

beforeAll(async () => {
  app = await boot();
  await claim(app, "owner");
});
afterAll(cleanup);

/** Each call looks like a different client unless told otherwise. */
const login = (password: string, ip = "203.0.113.1", username = "owner") =>
  app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ username, password }),
  });

describe("login rate limit", () => {
  it("lets a normal number of attempts through", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await login("wrongpass123")).status).toBe(401);
    }
  });

  it("blocks the grinder once the window fills", async () => {
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      seen.push((await login("wrongpass123")).status);
    }
    expect(seen).toContain(429);
    // 8 guesses, then the door shuts.
    expect(seen.filter((s) => s === 401)).toHaveLength(8);
    expect(seen.filter((s) => s === 429)).toHaveLength(4);
  });

  it("tells the caller when to come back", async () => {
    for (let i = 0; i < 9; i++) await login("wrongpass123");
    const res = await login("wrongpass123");
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await json(res)).error).toMatch(/too many/i);
  });

  it("still refuses the right password once locked out", async () => {
    for (let i = 0; i < 9; i++) await login("wrongpass123");
    // Not "wrong password": the limiter runs before we ever hash.
    expect((await login("ownerpass123")).status).toBe(429);
  });
});

describe("who gets blamed", () => {
  it("does not punish a different IP for someone else guessing", async () => {
    for (let i = 0; i < 10; i++)
      await login("wrongpass123", "203.0.113.99", "someoneelse");
    // Different IP, different account: unaffected.
    expect((await login("ownerpass123", "198.51.100.7", "owner")).status).toBe(
      200,
    );
  });

  it("follows one account across many IPs", async () => {
    // A botnet: every request from a fresh address, all against one username.
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push(
        (await login("wrongpass123", `198.51.100.${i}`, "owner")).status,
      );
    }
    // The per-IP bucket never fills, but the per-username one does.
    expect(statuses).toContain(429);
  });

  // Deliberately /register, not /login: login also has a per-username bucket,
  // which would return 429 even if the IP handling were broken, so the test
  // would pass for the wrong reason. Register is keyed on IP alone,
  // so only the X-Forwarded-For logic can produce this 429.
  it("ignores an X-Forwarded-For the caller made up", async () => {
    // Caddy APPENDS the real peer, so the LAST hop is the one it vouched for.
    // Trusting the leftmost (the classic mistake) would let anyone mint a fresh
    // bucket per request just by sending a header.
    const spoof = (n: number) =>
      app.request("/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // "I'm a new client every time", then the address Caddy appended.
          "x-forwarded-for": `10.0.0.${n}, 203.0.113.42`,
        },
        body: JSON.stringify({
          inviteCode: "nope",
          username: `spoof${n}`,
          password: "longenough1",
        }),
      });

    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) statuses.push((await spoof(i)).status);
    expect(statuses).toContain(429);
  });
});

describe("register and setup", () => {
  it("caps registration attempts so nobody can make us hash on demand", async () => {
    // Deliberately generous (20/min): a whole friend group joining from one
    // flat's wifi shares an IP, and the invite code is the real gate anyway.
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.5",
        },
        body: JSON.stringify({
          inviteCode: "nope",
          username: `x${i}zz`,
          password: "longenough1",
        }),
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });

  it("caps setup attempts even though it is already claimed", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await post(app, "/api/setup", {
        communityName: "x",
        username: "someone",
        password: "longenough1",
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });

  it("keeps buckets per-endpoint", async () => {
    for (let i = 0; i < 10; i++) await login("wrongpass123", "203.0.113.77");
    // Login is locked for this IP; /api/info is not a thing we limit.
    expect((await app.request("/api/info")).status).toBe(200);
  });
});
