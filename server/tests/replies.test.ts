import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { WebSocket as WsClient } from "ws";
import { WebSocket } from "ws";
import { REPLY_SNIPPET_MAX, type Channel, type MessageView } from "@ccchat/shared";
import { boot, claim, cleanup, get, json, uniq } from "./harness.js";

let app: Awaited<ReturnType<typeof boot>>;
let server: Server;
let port: number;
let token: string;
let general: string;
let random: string;
let ws: WsClient;

beforeAll(async () => {
  app = await boot();
  token = (await claim(app)).token;

  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", token),
  );
  general = channels.find((c) => c.name === "general")!.id;
  random = channels.find((c) => c.name === "random")!.id;

  const { attachWebSocket } = await import("../src/ws.js");
  server = createServer();
  attachWebSocket(server);
  await new Promise<void>((r) => server.listen(0, () => r()));
  port = (server.address() as AddressInfo).port;

  ws = new WebSocket(`ws://localhost:${port}/ws?token=${encodeURIComponent(token)}`);
  await new Promise<void>((r) => ws.on("open", () => r()));
});

afterAll(async () => {
  ws.terminate();
  server.close();
  await cleanup();
});

/** Resolve on the broadcast for a specific message rather than after a sleep.
 *  Content is unique per test, so it identifies the echo unambiguously. */
function awaitMessage(content: string, timeoutMs = 3000): Promise<MessageView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      reject(new Error(`no message.new for "${content}" within ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(raw: Buffer) {
      const event = JSON.parse(raw.toString());
      if (event.type !== "message.new" || event.message.content !== content) return;
      clearTimeout(timer);
      ws.off("message", onMessage);
      resolve(event.message);
    }
    ws.on("message", onMessage);
  });
}

/** Listener first, then send: the broadcast can land before send() returns. */
function post(channelId: string, content: string, replyToId?: string) {
  const landed = awaitMessage(content);
  ws.send(JSON.stringify({ type: "message.create", channelId, content, replyToId }));
  return landed;
}

const history = async (channelId: string) =>
  (
    await json<{ messages: MessageView[] }>(
      await get(app, `/api/messages/${channelId}`, token),
    )
  ).messages;

it("quotes the message it replies to", async () => {
  const original = await post(general, `original ${uniq()}`);
  const reply = await post(general, `reply ${uniq()}`, original.id);

  expect(reply.replyTo).toMatchObject({
    id: original.id,
    content: original.content,
    deleted: false,
  });
  expect(reply.replyTo?.author?.displayName).toBe(original.author?.displayName);
});

it("leaves a plain message with no quote", async () => {
  const plain = await post(general, `plain ${uniq()}`);
  expect(plain.replyTo).toBeNull();
});

it("drops a reply aimed at another channel's message", async () => {
  const elsewhere = await post(random, `elsewhere ${uniq()}`);
  const reply = await post(general, `cross ${uniq()}`, elsewhere.id);

  expect(reply.replyTo).toBeNull();
});

it("drops a reply aimed at a message that does not exist", async () => {
  const reply = await post(general, `ghost ${uniq()}`, "no-such-message-id");
  expect(reply.replyTo).toBeNull();
});

it("drops a reply aimed at an already deleted message", async () => {
  const original = await post(general, `doomed ${uniq()}`);
  await app.request(`/api/messages/${original.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });

  const reply = await post(general, `late ${uniq()}`, original.id);
  expect(reply.replyTo).toBeNull();
});

it("turns the quote into a tombstone when the original is deleted afterwards", async () => {
  const original = await post(general, `regretted ${uniq()}`);
  const reply = await post(general, `quoting ${uniq()}`, original.id);
  expect(reply.replyTo?.deleted).toBe(false);

  await app.request(`/api/messages/${original.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });

  const shown = (await history(general)).find((m) => m.id === reply.id);
  // The tombstone keeps the id but surrenders what the original said and who said it.
  expect(shown?.replyTo).toEqual({
    id: original.id,
    content: "",
    author: null,
    deleted: true,
  });
});

it("trims the quote to the snippet cap and flattens it to one line", async () => {
  const long = `${uniq()} ${"x".repeat(REPLY_SNIPPET_MAX)}\nsecond line`;
  const original = await post(general, long);
  const reply = await post(general, `quoting long ${uniq()}`, original.id);

  expect(reply.replyTo?.content).toHaveLength(REPLY_SNIPPET_MAX);
  expect(reply.replyTo?.content).not.toContain("\n");
  // The message itself is untouched; only the quote is abbreviated.
  expect(original.content).toBe(long);
});

it("does not split an emoji when trimming the quote", async () => {
  const original = await post(general, "🎉".repeat(REPLY_SNIPPET_MAX + 10));
  const reply = await post(general, `quoting emoji ${uniq()}`, original.id);

  expect([...(reply.replyTo?.content ?? "")]).toHaveLength(REPLY_SNIPPET_MAX);
  expect(reply.replyTo?.content).not.toContain("�");
  expect(reply.replyTo?.content?.endsWith("🎉")).toBe(true);
});
