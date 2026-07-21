import {
  ClientEventType,
  ServerEventType,
  type Channel,
  type MessageView,
  type MessageWindow,
} from "@ccchat/shared";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { WebSocket, type WebSocket as WsClient } from "ws";
import { boot, claim, cleanup, get, json, post } from "./harness.js";

let app: Awaited<ReturnType<typeof boot>>;
let server: Server;
let token: string;
let general: string;
let empty: string;
let ws: WsClient;
const posted: MessageView[] = [];

const around = async (channelId: string, messageId: string, limit = 5) =>
  get(app, `/api/messages/${channelId}/around/${messageId}?limit=${limit}`, token);

beforeAll(async () => {
  app = await boot();
  token = (await claim(app)).token;

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", token),
  );
  general = channels.find((c) => c.name === "general")!.id;
  empty = (
    await json<{ channel: Channel }>(
      await post(app, "/api/channels", { name: "empty", type: "text" }, token),
    )
  ).channel.id;

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server);
  await new Promise<void>((r) => server.listen(0, () => r()));
  const port = (server.address() as AddressInfo).port;
  ws = new WebSocket(`ws://localhost:${port}/ws?token=${encodeURIComponent(token)}`);
  await new Promise<void>((r) => ws.on("open", () => r()));

  for (let i = 0; i < 30; i++) posted.push(await say(`line ${i}`));
});

afterAll(async () => {
  ws.terminate();
  server.close();
  await cleanup();
});

function say(content: string): Promise<MessageView> {
  const landed = new Promise<MessageView>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no echo for "${content}"`)), 3000);
    function on(raw: Buffer) {
      const e = JSON.parse(raw.toString());
      if (e.type !== ServerEventType.Message_New || e.message.content !== content) return;
      clearTimeout(timer);
      ws.off("message", on);
      resolve(e.message as MessageView);
    }
    ws.on("message", on);
  });
  ws.send(
    JSON.stringify({
      type: ClientEventType.Message_Create,
      channelId: general,
      content,
    }),
  );
  return landed;
}

it("centres the window on the target, oldest first", async () => {
  const target = posted[15];
  const w = await json<MessageWindow>(await around(general, target.id));

  expect(w.messages.map((m) => m.content)).toEqual([
    "line 11",
    "line 12",
    "line 13",
    "line 14",
    "line 15",
    "line 16",
    "line 17",
    "line 18",
    "line 19",
    "line 20",
  ]);
  expect(w.hasMoreBefore).toBe(true);
  expect(w.hasMoreAfter).toBe(true);
});

it("reports nothing older at the start of a channel", async () => {
  const w = await json<MessageWindow>(await around(general, posted[0].id));
  expect(w.messages[0].content).toBe("line 0");
  expect(w.hasMoreBefore).toBe(false);
  expect(w.hasMoreAfter).toBe(true);
});

it("reports nothing newer at the end of a channel", async () => {
  const w = await json<MessageWindow>(await around(general, posted.at(-1)!.id));
  expect(w.messages.at(-1)!.content).toBe("line 29");
  expect(w.hasMoreBefore).toBe(true);
  expect(w.hasMoreAfter).toBe(false);
});

it("404s when the message belongs to another channel", async () => {
  expect((await around(empty, posted[3].id)).status).toBe(404);
});

it("404s on an unknown message", async () => {
  expect((await around(general, "no-such-id")).status).toBe(404);
});

it("404s on a deleted message rather than centring on a hole", async () => {
  const doomed = await say("about to go");
  await app.request(`/api/messages/${doomed.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  expect((await around(general, doomed.id)).status).toBe(404);
});

it("requires auth", async () => {
  const res = await app.request(`/api/messages/${general}/around/${posted[0].id}`);
  expect(res.status).toBe(401);
});
