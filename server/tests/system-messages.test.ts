import { SystemEvent, type Channel, type MessageView } from "@ccchat/shared";
import { afterAll, beforeAll, expect, it } from "vitest";
import { boot, claim, cleanup, get, json, mkInvite, register, uniq } from "./harness.js";
import type { Hono } from "hono";

let app: Hono<any>;
let token: string;
let general: string;
let random: string;

beforeAll(async () => {
  app = await boot();
  token = (await claim(app)).token;
  const { channels } = await json<{ channels: Channel[] }>(
    await get(app, "/api/channels", token),
  );
  general = channels.find((c) => c.name === "general")!.id;
  random = channels.find((c) => c.name === "random")!.id;
});

afterAll(cleanup);

const history = async (channelId: string) =>
  (
    await json<{ messages: MessageView[] }>(
      await get(app, `/api/messages/${channelId}`, token),
    )
  ).messages;

const invite = async () => (await mkInvite(app, token, { maxUses: 0 })).invite.code;

it("posts a member_join line, authored by the newcomer, to the first text channel", async () => {
  const name = uniq();
  const res = await register(app, await invite(), name);
  expect(res.status).toBe(200);

  const joins = (await history(general)).filter(
    (m) => m.systemEvent === SystemEvent.Member_Join,
  );
  expect(joins).toHaveLength(1);
  expect(joins[0]!.author?.username).toBe(name);
  expect(joins[0]!.content).toBe("");
});

it("posts to only the first text channel, not the others", async () => {
  const before = (await history(random)).length;
  await register(app, await invite(), uniq());
  expect(await history(random)).toHaveLength(before);
});

it("does not count toward unread", async () => {
  await register(app, await invite(), uniq());
  const { unreads } = await json<{ unreads: Record<string, number> }>(
    await get(app, "/api/channels/unreads", token),
  );
  expect(unreads[general] ?? 0).toBe(0);
});
