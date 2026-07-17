import { ChannelType, Role } from "@ccchat/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { boot, cleanup, get, json, post } from "./harness.js";

let app: Hono<any>;
beforeAll(async () => (app = await boot()));
afterAll(cleanup);

describe("claiming a fresh instance", () => {
  it("advertises that it needs setup", async () => {
    const res = await get(app, "/api/info");
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ needsSetup: true });
  });

  it("makes the first caller the owner and hands back an invite", async () => {
    const res = await post(app, "/api/setup", {
      communityName: "Chat Control Refugees",
      username: "lucien",
      password: "ownerpass123",
    });
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.user.role).toBe(Role.Owner);
    expect(body.communityName).toBe("Chat Control Refugees");
    expect(body.inviteCode).toBeTruthy();
    expect(body.token).toBeTruthy();
  });

  it("names the community from the wizard, not the env var", async () => {
    const body = await get(app, "/api/info").then(json);
    expect(body.name).toBe("Chat Control Refugees");
    expect(body.needsSetup).toBe(false);
  });

  // The whole security model: a public instance is claimable until someone
  // claims it, and never again.
  it("refuses a second claim forever", async () => {
    const res = await post(app, "/api/setup", {
      communityName: "Hostile Takeover",
      username: "attacker",
      password: "attackerpass123",
    });
    expect(res.status).toBe(409);
  });

  it("seeds default channels", async () => {
    const { token } = await post(app, "/api/auth/login", {
      username: "lucien",
      password: "ownerpass123",
    }).then(json);

    const { channels } = await get(app, "/api/channels", token).then(json);
    expect(channels.length).toBeGreaterThan(0);
    expect(channels.some((c: any) => c.type === ChannelType.Voice)).toBe(true);
    expect(channels.some((c: any) => c.type === ChannelType.Text)).toBe(true);
  });
});
