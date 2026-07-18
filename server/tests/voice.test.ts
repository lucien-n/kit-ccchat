import { ChannelType } from "@ccchat/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { boot, claim, cleanup, get, json } from "./harness.js";

let app: Hono<any>;
let token: string;

beforeAll(async () => {
  app = await boot();
  ({ token } = await claim(app));
});
afterAll(cleanup);

const config = (headers: Record<string, string>) =>
  app.request("/api/voice/config", {
    headers: { authorization: `Bearer ${token}`, ...headers },
  });

// The URL is derived from the request rather than configured, so these assertions
// are the contract that keeps self-hosters from having to set LIVEKIT_URL.
describe("LiveKit URL derivation", () => {
  it("uses wss when the proxy terminated TLS", async () => {
    const res = await config({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "chat.example.com",
    });
    expect(await json(res)).toEqual({ url: "wss://chat.example.com/livekit" });
  });

  it("falls back to ws for a plain-http dev server with no proxy", async () => {
    const res = await config({ host: "localhost:8080" });
    expect((await json(res)).url).toBe("ws://localhost:8080/livekit");
  });

  it("takes the first hop when a chain of proxies appends to x-forwarded-proto", async () => {
    const res = await config({
      "x-forwarded-proto": "https, http",
      "x-forwarded-host": "chat.example.com",
    });
    expect((await json(res)).url).toBe("wss://chat.example.com/livekit");
  });

  it("prefers x-forwarded-host over the raw host", async () => {
    const res = await config({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "chat.example.com",
      host: "ccchat:8080",
    });
    expect((await json(res)).url).toBe("wss://chat.example.com/livekit");
  });

  it("needs auth", async () => {
    expect((await app.request("/api/voice/config")).status).toBe(401);
  });
});

describe("voice tokens", () => {
  it("mints a token whose room is the channel id", async () => {
    const { channels } = await get(app, "/api/channels", token).then(json);
    const voice = channels.find((c: any) => c.type === ChannelType.Voice);

    const res = await app.request("/api/voice/token", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ channelId: voice.id }),
    });
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.room).toBe(voice.id);
    expect(body.canPublish).toBe(true);
    expect(body.token.split(".")).toHaveLength(3); // a JWT
  });

  it("refuses a channel that is not a voice channel", async () => {
    const { channels } = await get(app, "/api/channels", token).then(json);
    const text = channels.find((c: any) => c.type === ChannelType.Text);

    const res = await app.request("/api/voice/token", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ channelId: text.id }),
    });
    expect(res.status).toBe(400);
  });
});
