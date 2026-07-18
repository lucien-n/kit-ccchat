import {
  ClientEventType,
  ServerEventType,
  type Channel,
  type MessageView,
} from "@ccchat/shared";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { WebSocket, type WebSocket as WsClient } from "ws";
import {
  boot,
  claim,
  cleanup,
  get,
  json,
  mkInvite,
  patch,
  register,
  uniq,
} from "./harness.js";

let app: Awaited<ReturnType<typeof boot>>;
let server: Server;
let ownerToken: string;
let general: string;
let inviteCode: string;
let ws: WsClient;

beforeAll(async () => {
  app = await boot();
  ownerToken = (await claim(app)).token;
  ({
    invite: { code: inviteCode },
  } = await mkInvite(app, ownerToken, { maxUses: 0 }));

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", ownerToken),
  );
  general = channels.find((c) => c.name === "general")!.id;

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server);
  await new Promise<void>((r) => server.listen(0, () => r()));
  const port = (server.address() as AddressInfo).port;

  ws = new WebSocket(`ws://localhost:${port}/ws?token=${encodeURIComponent(ownerToken)}`);
  await new Promise<void>((r) => ws.on("open", () => r()));
});

afterAll(async () => {
  ws.terminate();
  server.close();
  await cleanup();
});

function awaitEvent(
  match: (e: any) => boolean,
  what: string,
  timeoutMs = 3000,
): Promise<any> {
  return new Promise((resolve, reject) => {
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

/** Listener first, then send: the broadcast can land before send() returns. */
function postMessage(content: string): Promise<MessageView> {
  const landed = awaitEvent(
    (e) => e.type === ServerEventType.Message_New && e.message.content === content,
    `message.new for "${content}"`,
  ).then((e) => e.message as MessageView);
  ws.send(
    JSON.stringify({ type: ClientEventType.Message_Create, channelId: general, content }),
  );
  return landed;
}

it("lets the author edit and broadcasts the update", async () => {
  const msg = await postMessage(`orig ${uniq()}`);
  const newContent = `edited ${uniq()}`;

  const broadcast = awaitEvent(
    (e) => e.type === ServerEventType.Message_Edited && e.message.id === msg.id,
    "message.edited",
  );

  const res = await patch(
    app,
    `/api/messages/${msg.id}`,
    { content: newContent },
    ownerToken,
  );
  expect(res.status).toBe(200);
  const body = await json<{ message: MessageView }>(res);
  expect(body.message.content).toBe(newContent);
  expect(body.message.editedAt).toBeTypeOf("number");

  expect((await broadcast).message.content).toBe(newContent);

  const list = (
    await json<{ messages: MessageView[] }>(
      await get(app, `/api/messages/${general}`, ownerToken),
    )
  ).messages;
  const found = list.find((m) => m.id === msg.id);
  expect(found?.content).toBe(newContent);
  expect(found?.editedAt).toBeTypeOf("number");
});

it("forbids editing someone else's message", async () => {
  const msg = await postMessage(`mine ${uniq()}`);
  const { token: other } = await register(app, inviteCode, uniq()).then(json);
  const res = await patch(app, `/api/messages/${msg.id}`, { content: "hijack" }, other);
  expect(res.status).toBe(403);
});

it("404s on a missing message", async () => {
  const res = await patch(app, "/api/messages/no-such-id", { content: "x" }, ownerToken);
  expect(res.status).toBe(404);
});

it("rejects blank content", async () => {
  const msg = await postMessage(`blank ${uniq()}`);
  const res = await patch(app, `/api/messages/${msg.id}`, { content: "   " }, ownerToken);
  expect(res.status).toBe(400);
});
