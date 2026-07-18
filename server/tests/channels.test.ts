import { ChannelType, type Channel } from "@ccchat/shared";
import type { Hono } from "hono";
import { afterAll, beforeAll, expect, it } from "vitest";
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
let token: string;

beforeAll(async () => {
  app = await boot();
  ({ token } = await claim(app));
});
afterAll(cleanup);

const list = async () =>
  (await json<{ channels: Channel[] }>(await get(app, "/api/channels", token))).channels;

it("creates a voice channel and lists it as one", async () => {
  const res = await post(
    app,
    "/api/channels",
    { name: uniq(), type: ChannelType.Voice },
    token,
  );
  expect(res.status).toBe(200);
  const { channel } = await json<{ channel: Channel }>(res);
  expect(channel.type).toBe(ChannelType.Voice);

  const found = (await list()).find((c) => c.id === channel.id);
  expect(found?.type).toBe(ChannelType.Voice);
});

it("defaults to a text channel when no type is given", async () => {
  const { channel } = await json<{ channel: Channel }>(
    await post(app, "/api/channels", { name: uniq() }, token),
  );
  expect(channel.type).toBe(ChannelType.Text);
});

it("rejects an unknown channel type", async () => {
  const res = await post(app, "/api/channels", { name: uniq(), type: "audio" }, token);
  expect(res.status).toBe(400);
});

it("forbids non-admins from creating channels", async () => {
  const { invite } = await mkInvite(app, token, { maxUses: 0 });
  const { token: memberToken } = await json<{ token: string }>(
    await register(app, invite.code, uniq()),
  );
  const res = await post(
    app,
    "/api/channels",
    { name: uniq(), type: ChannelType.Voice },
    memberToken,
  );
  expect(res.status).toBe(403);
});
