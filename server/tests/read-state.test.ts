import { ClientEventType, ServerEventType, type Channel } from "@ccchat/shared";
import type { Hono } from "hono";
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
  post,
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let server: Server;
let owner: string;
let ownerWs: WsClient;
let member: string;
let general: string;

beforeAll(async () => {
  app = await boot();
  ({ token: owner } = await claim(app, "owner"));
  const { invite } = await mkInvite(app, owner, { maxUses: 0 });
  ({ token: member } = await json(await register(app, invite.code, uniq())));

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", owner),
  );
  general = channels.find((c) => c.name === "general")!.id;

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server);
  await new Promise<void>((r) => server.listen(0, () => r()));
  const port = (server.address() as AddressInfo).port;

  ownerWs = new WebSocket(`ws://localhost:${port}/ws?token=${encodeURIComponent(owner)}`);
  await new Promise<void>((r) => ownerWs.on("open", () => r()));
});

afterAll(async () => {
  ownerWs.terminate();
  server.close();
  await cleanup();
});

function say(content: string) {
  const landed = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no echo")), 3000);
    function on(raw: Buffer) {
      const e = JSON.parse(raw.toString());
      if (e.type !== ServerEventType.Message_New || e.message.content !== content) return;
      clearTimeout(timer);
      ownerWs.off("message", on);
      resolve();
    }
    ownerWs.on("message", on);
  });
  ownerWs.send(
    JSON.stringify({ type: ClientEventType.Message_Create, channelId: general, content }),
  );
  return landed;
}

const unread = async (token: string) =>
  (
    await json<{ unreads: Record<string, number> }>(
      await get(app, "/api/channels/unreads", token),
    )
  ).unreads[general] ?? 0;

it("marking a channel read clears its badge, and later messages start a new count", async () => {
  await say(uniq());
  await say(uniq());
  expect(await unread(member)).toBe(2);

  expect((await post(app, `/api/channels/${general}/read`, {}, member)).status).toBe(200);
  expect(await unread(member)).toBe(0);

  await say(uniq());
  expect(await unread(member)).toBe(1);
});

it("does not count what you sent yourself", async () => {
  await post(app, `/api/channels/${general}/read`, {}, owner);
  await say(uniq());
  expect(await unread(owner)).toBe(0);
});
