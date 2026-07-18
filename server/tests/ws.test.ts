import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { WebSocket as WsClient } from "ws";
import { WebSocket } from "ws";
import { ServerEventType } from "@ccchat/shared";
import { boot, claim, cleanup, json, mkInvite, register } from "./harness.js";

// Fast enough that a reap takes ~2 sweeps rather than a minute, slow enough that
// a loaded CI box still gets a pong back in time.
const HEARTBEAT_MS = 40;

let server: Server;
let port: number;
let ownerToken: string;
let ownerId: string;
let memberToken: string;

beforeAll(async () => {
  const app = await boot();
  const owner = await claim(app);
  ownerToken = owner.token;
  ownerId = (await json<{ user: { id: string } }>(await getMe(app, owner.token))).user.id;

  const { invite } = await mkInvite(app, owner.token, { maxUses: 0 });
  const res = await register(app, invite.code, "watcher");
  memberToken = (await json<{ token: string }>(res)).token;

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
