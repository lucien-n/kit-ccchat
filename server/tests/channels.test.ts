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

const create = (name: string, type = ChannelType.Text) =>
  post(app, "/api/channels", { name, type }, token);

it("rejects a channel whose name is already taken", async () => {
  const name = uniq();
  expect((await create(name)).status).toBe(200);

  const dupe = await create(name);
  expect(dupe.status).toBe(409);
  expect((await json<{ error: string }>(dupe)).error).toContain(name);
});

it("treats a difference of case as the same name", async () => {
  const name = `Case${uniq()}`;
  expect((await create(name)).status).toBe(200);
  expect((await create(name.toUpperCase())).status).toBe(409);
  expect((await create(name.toLowerCase())).status).toBe(409);
});

it("treats surrounding space as the same name", async () => {
  const name = uniq();
  expect((await create(name)).status).toBe(200);
  expect((await create(`  ${name}  `)).status).toBe(409);
});

it("lets a voice channel reuse a text channel's name", async () => {
  const name = uniq();
  expect((await create(name, ChannelType.Text)).status).toBe(200);
  expect((await create(name, ChannelType.Voice)).status).toBe(200);
  expect((await create(name, ChannelType.Voice)).status).toBe(409);
});

it("frees the name again once the channel is deleted", async () => {
  const name = uniq();
  const { channel } = await json<{ channel: Channel }>(await create(name));
  expect((await create(name)).status).toBe(409);

  await app.request(`/api/channels/${channel.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  expect((await create(name)).status).toBe(200);
});
