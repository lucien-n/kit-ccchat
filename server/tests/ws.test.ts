import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { WebSocket as WsClient } from "ws";
import { WebSocket } from "ws";
import { ChannelType, ClientEventType, ServerEventType } from "@ccchat/shared";
import { boot, claim, cleanup, json, mkInvite, post, register } from "./harness.js";

// Fast enough that a reap takes ~2 sweeps rather than a minute, slow enough that
// a loaded CI box still gets a pong back in time.
const HEARTBEAT_MS = 40;

let app: Awaited<ReturnType<typeof boot>>;
let server: Server;
let port: number;
let ownerToken: string;
let ownerId: string;
let memberToken: string;
let memberId: string;
let textChannelId: string;
let voiceChannelId: string;

beforeAll(async () => {
  app = await boot();
  const owner = await claim(app);
  ownerToken = owner.token;
  ownerId = (await json<{ user: { id: string } }>(await getMe(app, owner.token))).user.id;

  const { invite } = await mkInvite(app, owner.token, { maxUses: 0 });
  const res = await register(app, invite.code, "watcher");
  const member = await json<{ token: string; user: { id: string } }>(res);
  memberToken = member.token;
  memberId = member.user.id;

  textChannelId = await mkChannel("typing-text", ChannelType.Text);
  voiceChannelId = await mkChannel("typing-voice", ChannelType.Voice);

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server, HEARTBEAT_MS);
  await new Promise<void>((r) => server.listen(0, () => r()));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.close();
  await cleanup();
});

function getMe(app: Awaited<ReturnType<typeof boot>>, token: string) {
  return app.request("/api/auth/me", { headers: { authorization: `Bearer ${token}` } });
}

async function mkChannel(name: string, type: ChannelType): Promise<string> {
  const res = await post(app, "/api/channels", { name, type }, ownerToken);
  return (await json<{ channel: { id: string } }>(res)).channel.id;
}

function connect(token: string): Promise<WsClient> {
  const ws = new WebSocket(
    `ws://localhost:${port}/ws?token=${encodeURIComponent(token)}`,
  );
  return new Promise((resolve, reject) => {
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

/** Resolve once a presence event satisfies `match`, so the assertions never race
 *  a fixed sleep. */
function presenceWhere(
  ws: WsClient,
  match: (online: string[]) => boolean,
  timeoutMs = 3000,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      reject(new Error(`no matching presence event within ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(raw: Buffer) {
      const event = JSON.parse(raw.toString());
      if (event.type !== ServerEventType.Presence || !match(event.online)) return;
      clearTimeout(timer);
      ws.off("message", onMessage);
      resolve(event.online);
    }
    ws.on("message", onMessage);
  });
}

/** The next typing event this socket sees, or a rejection if none arrives. */
function nextTyping(ws: WsClient, timeoutMs = 1000): Promise<{ userId: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      reject(new Error(`no typing event within ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(raw: Buffer) {
      const event = JSON.parse(raw.toString());
      if (event.type !== ServerEventType.Typing_Started) return;
      clearTimeout(timer);
      ws.off("message", onMessage);
      resolve(event);
    }
    ws.on("message", onMessage);
  });
}

const sendTyping = (ws: WsClient, channelId: string) =>
  ws.send(JSON.stringify({ type: ClientEventType.Typing_Start, channelId }));

it("relays typing to the other clients", async () => {
  const watcher = await connect(memberToken);
  const typist = await connect(ownerToken);

  const seen = nextTyping(watcher);
  sendTyping(typist, textChannelId);

  expect(await seen).toMatchObject({ userId: ownerId, channelId: textChannelId });

  watcher.terminate();
  typist.terminate();
});

it("ignores typing in a voice channel", async () => {
  const watcher = await connect(memberToken);
  const typist = await connect(ownerToken);

  sendTyping(typist, voiceChannelId);
  await expect(nextTyping(watcher, 200)).rejects.toThrow(/no typing event/);

  watcher.terminate();
  typist.terminate();
});

it("ignores typing from a muted member", async () => {
  await post(app, `/api/moderation/${memberId}/mute`, { minutes: 60 }, ownerToken);

  const watcher = await connect(ownerToken);
  const typist = await connect(memberToken);

  sendTyping(typist, textChannelId);
  await expect(nextTyping(watcher, 200)).rejects.toThrow(/no typing event/);

  await post(app, `/api/moderation/${memberId}/unmute`, undefined, ownerToken);
  watcher.terminate();
  typist.terminate();
});

it("rejects a socket with no token", async () => {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const err = await new Promise<Error>((r) => ws.on("error", r));
  expect(err.message).toContain("401");
});

it("reaps a client that stops answering pings", async () => {
  const watcher = await connect(memberToken);
  const ghost = await connect(ownerToken);

  await presenceWhere(watcher, (online) => online.includes(ownerId));

  // A paused socket never processes the ping, so it never auto-pongs: this is
  // what a closed laptop looks like to the server. No close frame is ever sent.
  ghost.pause();

  const online = await presenceWhere(watcher, (o) => !o.includes(ownerId));
  expect(online).not.toContain(ownerId);

  ghost.terminate();
  watcher.terminate();
});

it("keeps a healthy client through many heartbeats", async () => {
  const watcher = await connect(memberToken);
  const healthy = await connect(ownerToken);
  await presenceWhere(watcher, (online) => online.includes(ownerId));

  // Long enough to cover several sweeps; the pongs are what keep it listed.
  await new Promise((r) => setTimeout(r, HEARTBEAT_MS * 6));

  expect(healthy.readyState).toBe(WebSocket.OPEN);
  await expect(presenceWhere(watcher, (o) => !o.includes(ownerId), 200)).rejects.toThrow(
    /no matching presence/,
  );

  healthy.terminate();
  watcher.terminate();
});
