import { ClientEventType, ServerEventType, type Channel } from "@ccchat/shared";
import type { Hono } from "hono";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket, type WebSocket as WsClient } from "ws";
import {
  boot,
  claim,
  cleanup,
  get,
  json,
  mkInvite,
  post,
  put,
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let server: Server;
let port: number;
let owner: string;
let inviteCode: string;
let general: string;
let voice: string;

beforeAll(async () => {
  app = await boot();
  ({ token: owner } = await claim(app, "owner"));
  ({
    invite: { code: inviteCode },
  } = await mkInvite(app, owner, { maxUses: 0 }));

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", owner),
  );
  general = channels.find((c) => c.name === "general")!.id;
  voice = (
    await json<{ channel: Channel }>(
      await post(app, "/api/channels", { name: uniq(), type: "voice" }, owner),
    )
  ).channel.id;

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server);
  await new Promise<void>((r) => server.listen(0, () => r()));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await cleanup();
});

async function open(token: string) {
  const sock = new WebSocket(
    `ws://localhost:${port}/ws?token=${encodeURIComponent(token)}`,
  );
  await new Promise<void>((r) => sock.on("open", () => r()));
  return sock;
}

/** Resolves with whichever comes first: the echoed message, or the server's
 *  refusal. Waiting only for the echo would hang for the whole timeout on
 *  exactly the case these tests care about. */
function say(sock: WsClient, channelId: string, content: string) {
  const settled = new Promise<{ ok: boolean; error?: string }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no reply")), 3000);
    function on(raw: Buffer) {
      const e = JSON.parse(raw.toString());
      if (e.type === ServerEventType.Message_New && e.message.content === content) {
        clearTimeout(timer);
        sock.off("message", on);
        resolve({ ok: true });
      }
      if (e.type === ServerEventType.Error) {
        clearTimeout(timer);
        sock.off("message", on);
        resolve({ ok: false, error: e.message });
      }
    }
    sock.on("message", on);
  });
  sock.send(JSON.stringify({ type: ClientEventType.Message_Create, channelId, content }));
  return settled;
}

const act = (id: string, action: string, body: unknown = {}) =>
  post(app, `/api/moderation/${id}/${action}`, body, owner);

async function newMember() {
  const username = uniq();
  const { token, user } = await json<{ token: string; user: { id: string } }>(
    await register(app, inviteCode, username),
  );
  return { username, token, id: user.id };
}

describe("mute", () => {
  it("stops the member sending, and unmute lets them go again", async () => {
    const m = await newMember();
    const sock = await open(m.token);

    expect((await say(sock, general, uniq())).ok).toBe(true);

    const muted = await act(m.id, "mute", { minutes: 60 });
    expect(muted.status).toBe(200);
    expect((await json<any>(muted)).mutedUntil).toBeGreaterThan(Date.now());

    expect(await say(sock, general, uniq())).toEqual({
      ok: false,
      error: "you are muted",
    });

    expect((await act(m.id, "unmute")).status).toBe(200);
    expect((await say(sock, general, uniq())).ok).toBe(true);

    sock.terminate();
  });

  it("hands out a voice token that cannot publish", async () => {
    const m = await newMember();
    const canPublish = async () =>
      (
        await json<any>(
          await post(app, "/api/voice/token", { channelId: voice }, m.token),
        )
      ).canPublish;

    expect(await canPublish()).toBe(true);
    await act(m.id, "mute", { minutes: 60 });
    expect(await canPublish()).toBe(false);
    await act(m.id, "unmute");
    expect(await canPublish()).toBe(true);
  });

  it("defaults to an hour when no duration is given", async () => {
    const m = await newMember();
    const { mutedUntil } = await json<any>(await act(m.id, "mute"));
    expect(Math.round((mutedUntil - Date.now()) / 60_000)).toBe(60);
  });
});

describe("unban", () => {
  it("lets a banned member log back in", async () => {
    const m = await newMember();
    expect((await act(m.id, "ban")).status).toBe(200);
    expect(
      (
        await post(app, "/api/auth/login", {
          username: m.username,
          password: "joinpass123",
        })
      ).status,
    ).toBe(403);

    expect((await act(m.id, "unban")).status).toBe(200);
    expect(
      (
        await post(app, "/api/auth/login", {
          username: m.username,
          password: "joinpass123",
        })
      ).status,
    ).toBe(200);
  });
});

describe("who you may act on", () => {
  it("refuses to let you moderate yourself", async () => {
    const me = await json<any>(await get(app, "/api/auth/me", owner));
    expect((await act(me.user.id, "mute", { minutes: 5 })).status).toBe(400);
  });

  // The capability check passes here: the admin may moderate. It is the rank
  // check inside resolveTarget that has to stop them.
  it("refuses a target who outranks you", async () => {
    const admin = await newMember();
    const { role } = await json<any>(
      await post(app, "/api/roles", { name: uniq(), permission: "admin" }, owner),
    );
    await put(app, `/api/roles/members/${admin.id}`, { roleIds: [role.id] }, owner);

    const victim = await newMember();
    expect(
      (await post(app, `/api/moderation/${victim.id}/kick`, {}, admin.token)).status,
    ).toBe(200);

    const me = await json<any>(await get(app, "/api/auth/me", owner));
    expect(
      (await post(app, `/api/moderation/${me.user.id}/kick`, {}, admin.token)).status,
    ).toBe(403);
  });

  it("404s on someone who does not exist", async () => {
    expect((await act("no-such-user", "unban")).status).toBe(404);
  });
});
