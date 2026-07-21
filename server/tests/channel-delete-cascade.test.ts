import {
  ChannelType,
  ClientEventType,
  ServerEventType,
  type Channel,
  type Member,
} from "@ccchat/shared";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { WebSocket, type WebSocket as WsClient } from "ws";
import { boot, claim, cleanup, json, mkInvite, post, register, uniq } from "./harness.js";

let app: Hono<any>;
let server: Server;
let owner: string;
let ownerWs: WsClient;
let anaName: string;
let ana: { token: string; user: Member };

beforeAll(async () => {
  app = await boot();
  ({ token: owner } = await claim(app, "owner"));
  const { invite } = await mkInvite(app, owner, { maxUses: 0 });
  anaName = uniq();
  ana = await json(await register(app, invite.code, anaName));

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

function say(channelId: string, content: string) {
  const landed = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no echo")), 3000);
    function on(raw: Buffer) {
      const e = JSON.parse(raw.toString());
      if (e.type !== ServerEventType.Message_New || e.message.content !== content) return;
      clearTimeout(timer);
      ownerWs.off("message", on);
      resolve(e.message);
    }
    ownerWs.on("message", on);
  });
  ownerWs.send(
    JSON.stringify({ type: ClientEventType.Message_Create, channelId, content }),
  );
  return landed;
}

it("deleting a channel takes its messages and mentions with it", async () => {
  const { db } = await import("../src/db/index.js");
  const { messages, messageMentions } = await import("../src/db/schema/index.js");

  const { channel } = await json<{ channel: Channel }>(
    await post(app, "/api/channels", { name: uniq(), type: ChannelType.Text }, owner),
  );

  const message = await say(channel.id, `heads up @${anaName}`);
  expect(message.mentions).toContain(ana.user.id);

  const inChannel = () =>
    db.select().from(messages).where(eq(messages.channelId, channel.id)).all();
  const mentionRows = () =>
    db
      .select()
      .from(messageMentions)
      .where(eq(messageMentions.messageId, message.id))
      .all();

  expect(inChannel()).toHaveLength(1);
  expect(mentionRows()).toHaveLength(1);

  await app.request(`/api/channels/${channel.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${owner}` },
  });

  expect(inChannel()).toHaveLength(0);
  expect(mentionRows()).toHaveLength(0);
});
