import {
  ClientEventType,
  ServerEventType,
  type Channel,
  type Member,
  type Role,
} from "@ccchat/shared";
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
  patch,
  post,
  put,
  register,
  uniq,
} from "./harness.js";

let app: Hono<any>;
let server: Server;
let owner: string;
let ownerWs: WsClient;
let general: string;

/** The person being talked about, and a bystander who should stay quiet. */
let ana: { token: string; user: Member };
let bob: { token: string; user: Member };
let anaName: string;
let modRole: Role;

beforeAll(async () => {
  app = await boot();
  ({ token: owner } = await claim(app, "owner"));
  const { invite } = await mkInvite(app, owner, { maxUses: 0 });

  anaName = uniq();
  ana = await json(await register(app, invite.code, anaName));
  bob = await json(await register(app, invite.code, uniq()));

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", owner),
  );
  general = channels.find((c) => c.name === "general")!.id;

  ({ role: modRole } = await json(
    await post(app, "/api/roles", { name: "Moderators", permission: "member" }, owner),
  ));
  await put(app, `/api/roles/members/${ana.user.id}`, { roleIds: [modRole.id] }, owner);

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
    JSON.stringify({ type: ClientEventType.Message_Create, channelId: general, content }),
  );
  return landed;
}

const mentions = async (token: string) =>
  (
    await json<{ mentions: Record<string, number> }>(
      await get(app, "/api/channels/unreads", token),
    )
  ).mentions[general] ?? 0;

async function readAll() {
  for (const t of [owner, ana.token, bob.token])
    await post(app, `/api/channels/${general}/read`, {}, t);
  // A read marker and a message sent in the same millisecond tie, and unread
  // counts strictly newer messages, so step past the current ms before sending.
  await new Promise((r) => setTimeout(r, 5));
}

it("naming someone pings them and nobody else", async () => {
  await readAll();
  await say(`morning @${anaName} how did it go`);

  expect(await mentions(ana.token)).toBe(1);
  expect(await mentions(bob.token)).toBe(0);
});

it("a role mention pings everyone holding the role", async () => {
  await readAll();
  await say(`<@&${modRole.id}> can someone look at this`);

  expect(await mentions(ana.token)).toBe(1);
  expect(await mentions(bob.token)).toBe(0);
});

it("everyone pings the whole community without a row per member", async () => {
  await readAll();
  const message = await say("@everyone the server restarts tonight");

  expect(message.mentionsEveryone).toBe(true);
  expect(message.mentions).toEqual([]);
  expect(await mentions(ana.token)).toBe(1);
  expect(await mentions(bob.token)).toBe(1);
});

it("does not ping you for your own message", async () => {
  await readAll();
  await say("@everyone and also me");

  expect(await mentions(owner)).toBe(0);
});

it("an email address is not a mention", async () => {
  await readAll();
  await say(`mail me at ${anaName}@example.com`);

  expect(await mentions(ana.token)).toBe(0);
});

it("editing in a name pings, and editing it out stops counting", async () => {
  await readAll();
  const message = await say("nothing to see here");
  expect(await mentions(ana.token)).toBe(0);

  const url = `/api/messages/${message.id}`;
  await json(
    await patch(app, url, { content: `actually @${anaName} take a look` }, owner),
  );
  expect(await mentions(ana.token)).toBe(1);

  await json(await patch(app, url, { content: "never mind" }, owner));
  expect(await mentions(ana.token)).toBe(0);
});
