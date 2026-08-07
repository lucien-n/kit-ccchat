import {
  ClientEventType,
  ServerEventType,
  type Channel,
  type MessageView,
} from "@motus/shared";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { WebSocket, type WebSocket as WsClient } from "ws";
import {
  boot,
  claim,
  cleanup,
  del,
  get,
  json,
  mkInvite,
  put,
  register,
  uniq,
} from "./harness.js";

let app: Awaited<ReturnType<typeof boot>>;
let server: Server;
let ownerToken: string;
let memberToken: string;
let general: string;
let inviteCode: string;
let ws: WsClient;
let memberWs: WsClient;

function connect(port: number, token: string): Promise<WsClient> {
  const sock = new WebSocket(
    `ws://localhost:${port}/ws?token=${encodeURIComponent(token)}`,
  );
  return new Promise((r) => sock.on("open", () => r(sock)));
}

beforeAll(async () => {
  app = await boot();
  ownerToken = (await claim(app)).token;
  ({
    invite: { code: inviteCode },
  } = await mkInvite(app, ownerToken, { maxUses: 0 }));
  memberToken = (await register(app, inviteCode, uniq()).then(json)).token;

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", ownerToken),
  );
  general = channels.find((c) => c.name === "general")!.id;

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server);
  await new Promise<void>((r) => server.listen(0, () => r()));
  const port = (server.address() as AddressInfo).port;

  ws = await connect(port, ownerToken);
  memberWs = await connect(port, memberToken);
});

afterAll(async () => {
  ws.terminate();
  memberWs.terminate();
  server.close();
  await cleanup();
});

function awaitEvent(match: (e: any) => boolean, what: string, timeoutMs = 3000) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", on);
      reject(new Error(`no ${what} within ${timeoutMs}ms`));
    }, timeoutMs);
    function on(raw: Buffer) {
      const e = JSON.parse(raw.toString());
      if (!match(e)) return;
      clearTimeout(timer);
      ws.off("message", on);
      resolve(e);
    }
    ws.on("message", on);
  });
}

/** Listener first, then send: the broadcast lands on every socket (owner's `ws`
 *  included), so we always wait on `ws` regardless of who authored it. */
function postMessage(content: string, from: WsClient = ws): Promise<MessageView> {
  const landed = awaitEvent(
    (e) => e.type === ServerEventType.Message_New && e.message.content === content,
    `message.new for "${content}"`,
  ).then((e) => e.message as MessageView);
  from.send(
    JSON.stringify({ type: ClientEventType.Message_Create, channelId: general, content }),
  );
  return landed;
}

async function listPins(token = ownerToken) {
  return json<{ pins: MessageView[] }>(
    await get(app, `/api/messages/${general}/pins`, token),
  );
}

it("pins a message, broadcasts it, and reflects it in history and the pins list", async () => {
  const msg = await postMessage(`pin me ${uniq()}`);

  const broadcast = awaitEvent(
    (e) =>
      e.type === ServerEventType.Message_Pinned && e.id === msg.id && e.pinned === true,
    "message.pinned true",
  );

  const res = await put(app, `/api/messages/${msg.id}/pin`, undefined, ownerToken);
  expect(res.status).toBe(200);
  await broadcast;

  const { pins } = await listPins();
  expect(pins.map((p) => p.id)).toContain(msg.id);

  const history = (
    await json<{ messages: MessageView[] }>(
      await get(app, `/api/messages/${general}`, ownerToken),
    )
  ).messages;
  expect(history.find((m) => m.id === msg.id)?.pinned).toBe(true);
});

it("is idempotent: pinning twice does not duplicate the pin", async () => {
  const msg = await postMessage(`double ${uniq()}`);
  await put(app, `/api/messages/${msg.id}/pin`, undefined, ownerToken);
  await put(app, `/api/messages/${msg.id}/pin`, undefined, ownerToken);

  const { pins } = await listPins();
  expect(pins.filter((p) => p.id === msg.id)).toHaveLength(1);
});

it("unpins a message and broadcasts it", async () => {
  const msg = await postMessage(`unpin ${uniq()}`);
  await put(app, `/api/messages/${msg.id}/pin`, undefined, ownerToken);

  const broadcast = awaitEvent(
    (e) =>
      e.type === ServerEventType.Message_Pinned && e.id === msg.id && e.pinned === false,
    "message.pinned false",
  );

  const res = await del(app, `/api/messages/${msg.id}/pin`, undefined, ownerToken);
  expect(res.status).toBe(200);
  await broadcast;

  const { pins } = await listPins();
  expect(pins.map((p) => p.id)).not.toContain(msg.id);
});

it("lets a member pin their own message", async () => {
  const msg = await postMessage(`my own ${uniq()}`, memberWs);
  const res = await put(app, `/api/messages/${msg.id}/pin`, undefined, memberToken);
  expect(res.status).toBe(200);
});

it("forbids a member from pinning someone else's message", async () => {
  const msg = await postMessage(`owners ${uniq()}`);
  const res = await put(app, `/api/messages/${msg.id}/pin`, undefined, memberToken);
  expect(res.status).toBe(403);
});

it("lets an admin (owner) pin another member's message", async () => {
  const msg = await postMessage(`members ${uniq()}`, memberWs);
  const res = await put(app, `/api/messages/${msg.id}/pin`, undefined, ownerToken);
  expect(res.status).toBe(200);
});

it("404s pinning a missing message", async () => {
  const res = await put(app, "/api/messages/no-such-id/pin", undefined, ownerToken);
  expect(res.status).toBe(404);
});
