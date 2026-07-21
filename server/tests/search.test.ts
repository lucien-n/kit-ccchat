import {
  ClientEventType,
  MATCH_CLOSE,
  MATCH_OPEN,
  ServerEventType,
  type Channel,
  type MessageView,
  type SearchResults,
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
  post,
  register,
} from "./harness.js";

let app: Awaited<ReturnType<typeof boot>>;
let server: Server;
let ownerToken: string;
let otherToken: string;
let ownerId: string;
let otherId: string;
let general: string;
let annex: string;
let ws: WsClient;
let otherWs: WsClient;

const search = async (query: string, token = ownerToken) =>
  json<SearchResults>(await get(app, `/api/search?${query}`, token));

async function open(token: string, port: number) {
  const sock = new WebSocket(
    `ws://localhost:${port}/ws?token=${encodeURIComponent(token)}`,
  );
  await new Promise<void>((r) => sock.on("open", () => r()));
  return sock;
}

beforeAll(async () => {
  app = await boot();
  const claimed = await claim(app);
  ownerToken = claimed.token;
  const {
    invite: { code },
  } = await mkInvite(app, ownerToken, { maxUses: 0 });
  const registered = await register(app, code, "searcher").then(json<any>);
  otherToken = registered.token;
  otherId = registered.user.id;
  ownerId = (await json<any>(await get(app, "/api/auth/me", ownerToken))).user.id;

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", ownerToken),
  );
  general = channels.find((c) => c.name === "general")!.id;
  annex = (
    await json<{ channel: Channel }>(
      await post(app, "/api/channels", { name: "annex", type: "text" }, ownerToken),
    )
  ).channel.id;

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server);
  await new Promise<void>((r) => server.listen(0, () => r()));
  const port = (server.address() as AddressInfo).port;
  ws = await open(ownerToken, port);
  otherWs = await open(otherToken, port);
});

afterAll(async () => {
  ws.terminate();
  otherWs.terminate();
  server.close();
  await cleanup();
});

function say(sock: WsClient, channelId: string, content: string): Promise<MessageView> {
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
  sock.send(JSON.stringify({ type: ClientEventType.Message_Create, channelId, content }));
  return landed;
}

it("finds a message by a whole word", async () => {
  await say(ws, general, "the pangolin ate my homework");
  const res = await search("q=pangolin");
  expect(res.total).toBe(1);
  expect(res.hits[0].message.content).toBe("the pangolin ate my homework");
});

it("matches on a word prefix, so search-as-you-type works", async () => {
  await say(ws, general, "deploying the artichoke cluster");
  const res = await search("q=artich");
  expect(res.hits.map((h) => h.message.content)).toContain(
    "deploying the artichoke cluster",
  );
});

it("brackets the match inside the snippet", async () => {
  await say(ws, general, "a wombat appeared near the fence");
  const [hit] = (await search("q=wombat")).hits;
  expect(hit.snippet).toContain(`${MATCH_OPEN}wombat${MATCH_CLOSE}`);
});

it("requires every term to match", async () => {
  await say(ws, general, "quokka selfie season");
  expect((await search("q=quokka+selfie")).total).toBe(1);
  expect((await search("q=quokka+platypus")).total).toBe(0);
});

it("scopes to one channel", async () => {
  await say(ws, general, "narwhal in general");
  await say(ws, annex, "narwhal in annex");
  expect((await search("q=narwhal")).total).toBe(2);

  const scoped = await search(`q=narwhal&channelId=${annex}`);
  expect(scoped.total).toBe(1);
  expect(scoped.hits[0].message.channelId).toBe(annex);
});

it("scopes to one author", async () => {
  await say(ws, general, "capybara from the owner");
  await say(otherWs, general, "capybara from the other one");
  expect((await search("q=capybara")).total).toBe(2);

  const mine = await search(`q=capybara&authorId=${ownerId}`);
  expect(mine.total).toBe(1);
  expect(mine.hits[0].message.author?.id).toBe(ownerId);

  const theirs = await search(`q=capybara&authorId=${otherId}`);
  expect(theirs.hits[0].message.author?.id).toBe(otherId);
});

it("follows an edit", async () => {
  const msg = await say(ws, general, "an axolotl typo");
  await patch(
    app,
    `/api/messages/${msg.id}`,
    { content: "an ocelot instead" },
    ownerToken,
  );

  expect((await search("q=axolotl")).total).toBe(0);
  expect((await search("q=ocelot")).total).toBe(1);
});

it("drops a deleted message", async () => {
  const msg = await say(ws, general, "an ephemeral tapir");
  expect((await search("q=tapir")).total).toBe(1);

  await app.request(`/api/messages/${msg.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${ownerToken}` },
  });
  expect((await search("q=tapir")).total).toBe(0);
});

it("sorts newest first by default and by relevance on request", async () => {
  // Densest match first, then the most recent one, so the two orders disagree.
  const dense = "okapi okapi okapi okapi";
  await say(ws, general, dense);
  await say(ws, general, "one okapi, much later, among many other words entirely");

  const newest = await search("q=okapi");
  expect(newest.hits[0].message.content).toContain("much later");

  const relevant = await search("q=okapi&sort=relevance");
  expect(relevant.hits[0].message.content).toBe(dense);
});

it("paginates", async () => {
  for (let i = 0; i < 3; i++) await say(ws, general, `serval number ${i}`);

  const first = await search("q=serval&limit=2");
  expect(first.hits).toHaveLength(2);
  expect(first.total).toBe(3);
  expect(first.hasMore).toBe(true);

  const second = await search("q=serval&limit=2&offset=2");
  expect(second.hits).toHaveLength(1);
  expect(second.hasMore).toBe(false);
});

it("ignores a query too short to be worth running", async () => {
  await say(ws, general, "a");
  expect((await search("q=a")).total).toBe(0);
  expect((await search("q=")).total).toBe(0);
});

it("returns nothing when there is neither text nor a filter", async () => {
  expect((await search("q=")).total).toBe(0);
  expect((await search("")).total).toBe(0);
});

it("filters by author alone, with no text at all", async () => {
  const mine = await search(`q=&authorId=${otherId}`);
  expect(mine.total).toBeGreaterThan(0);
  expect(mine.hits.every((h) => h.message.author?.id === otherId)).toBe(true);
  expect(mine.hits.every((h) => h.message.systemEvent === null)).toBe(true);
});

it("filters by channel alone", async () => {
  const inAnnex = await search(`q=&channelId=${annex}`);
  expect(inAnnex.total).toBeGreaterThan(0);
  expect(inAnnex.hits.every((h) => h.message.channelId === annex)).toBe(true);
});

it("combines a channel and an author with no text", async () => {
  await say(otherWs, annex, "dugong sighting");
  const both = await search(`q=&channelId=${annex}&authorId=${otherId}`);
  expect(both.total).toBe(1);
  expect(both.hits[0].message.content).toBe("dugong sighting");
});

it("excludes deleted messages from a text-free filter", async () => {
  const doomed = await say(otherWs, annex, "briefly here");
  const before = (await search(`q=&channelId=${annex}&authorId=${otherId}`)).total;

  await app.request(`/api/messages/${doomed.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${otherToken}` },
  });

  const after = await search(`q=&channelId=${annex}&authorId=${otherId}`);
  expect(after.total).toBe(before - 1);
  expect(after.hits.some((h) => h.message.id === doomed.id)).toBe(false);
});

it("carries an excerpt, unhighlighted, for a text-free filter", async () => {
  const [hit] = (await search(`q=&channelId=${annex}`)).hits;
  expect(hit.snippet.length).toBeGreaterThan(0);
  expect(hit.snippet).not.toContain(MATCH_OPEN);
});

it("paginates a text-free filter", async () => {
  const all = await search(`q=&channelId=${annex}`);
  const first = await search(`q=&channelId=${annex}&limit=1`);
  expect(first.hits).toHaveLength(1);
  expect(first.total).toBe(all.total);
  expect(first.hasMore).toBe(all.total > 1);
});

it("treats FTS5 syntax as literal text rather than erroring", async () => {
  await say(ws, general, "a lemur AND a loris");
  for (const q of [
    "lemur AND",
    'lemur "',
    "lemur OR loris",
    "NEAR(lemur",
    "*",
    "-lemur",
  ]) {
    const res = await get(app, `/api/search?q=${encodeURIComponent(q)}`, ownerToken);
    expect(res.status).toBe(200);
  }
  expect((await search(`q=${encodeURIComponent("lemur AND")}`)).total).toBe(1);
});

it("never returns system messages", async () => {
  const { invite } = await mkInvite(app, ownerToken, { maxUses: 0 });
  await register(app, invite.code, "joiner");
  const res = await search("q=joiner");
  expect(res.hits.every((h) => h.message.systemEvent === null)).toBe(true);
});

it("requires auth", async () => {
  expect((await get(app, "/api/search?q=pangolin")).status).toBe(401);
});
