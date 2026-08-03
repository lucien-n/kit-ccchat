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
  patch,
  post,
  put,
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

const rename = (id: string, name: string, tok = token) =>
  patch(app, `/api/channels/${id}`, { name }, tok);

it("renames a channel and frees the old name", async () => {
  const before = uniq();
  const { channel } = await json<{ channel: Channel }>(await create(before));

  const after = uniq();
  const res = await rename(channel.id, after);
  expect(res.status).toBe(200);
  expect((await json<{ channel: Channel }>(res)).channel.name).toBe(after);

  expect((await list()).find((c) => c.id === channel.id)?.name).toBe(after);
  expect((await create(before)).status).toBe(200);
});

it("lets a channel keep its own name when only the casing changes", async () => {
  const name = uniq();
  const { channel } = await json<{ channel: Channel }>(await create(name));
  expect((await rename(channel.id, name.toUpperCase())).status).toBe(200);
});

it("refuses a name another channel of the same type already has", async () => {
  const taken = uniq();
  await create(taken);
  const { channel } = await json<{ channel: Channel }>(await create(uniq()));
  expect((await rename(channel.id, taken)).status).toBe(409);
});

it("lets a voice channel take a text channel's name", async () => {
  const name = uniq();
  await create(name, ChannelType.Text);
  const { channel } = await json<{ channel: Channel }>(
    await create(uniq(), ChannelType.Voice),
  );
  expect((await rename(channel.id, name)).status).toBe(200);
});

it("404s renaming a channel that is not there", async () => {
  expect((await rename("no-such-channel", uniq())).status).toBe(404);
});

it("rejects an invalid name and forbids a non-admin", async () => {
  const { channel } = await json<{ channel: Channel }>(await create(uniq()));
  expect((await rename(channel.id, "bad/name!")).status).toBe(400);

  const { invite } = await mkInvite(app, token, { maxUses: 0 });
  const { token: member } = await json<{ token: string }>(
    await register(app, invite.code, uniq()),
  );
  expect((await rename(channel.id, uniq(), member)).status).toBe(403);
});

const setMain = (id: string, tok = token) =>
  post(app, `/api/channels/${id}/main`, undefined, tok);

it("marks the seeded general channel as the main channel", async () => {
  const general = (await list()).find((c) => c.name === "general");
  expect(general?.isMain).toBe(true);
});

it("moves the main flag to another text channel, keeping exactly one", async () => {
  const { channel } = await json<{ channel: Channel }>(await create(uniq()));
  expect((await setMain(channel.id)).status).toBe(200);
  expect((await list()).filter((c) => c.isMain).map((c) => c.id)).toEqual([channel.id]);
});

it("refuses to make a voice channel the main channel", async () => {
  const { channel } = await json<{ channel: Channel }>(
    await create(uniq(), ChannelType.Voice),
  );
  expect((await setMain(channel.id)).status).toBe(400);
});

it("forbids a non-admin from changing the main channel", async () => {
  const { invite } = await mkInvite(app, token, { maxUses: 0 });
  const { token: member } = await json<{ token: string }>(
    await register(app, invite.code, uniq()),
  );
  const someText = (await list()).find((c) => c.type === ChannelType.Text)!;
  expect((await setMain(someText.id, member)).status).toBe(403);
});

it("hands the main flag to a surviving text channel when the main is deleted", async () => {
  const { channel } = await json<{ channel: Channel }>(await create(uniq()));
  await setMain(channel.id);
  await app.request(`/api/channels/${channel.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  const main = (await list()).filter((c) => c.isMain);
  expect(main).toHaveLength(1);
  expect(main[0]!.type).toBe(ChannelType.Text);
});

it("reorders channels, rewriting positions from the sent order", async () => {
  const ids = (await list()).map((c) => c.id);
  const reversed = [...ids].reverse();
  expect(
    (await put(app, "/api/channels/order", { orderedIds: reversed }, token)).status,
  ).toBe(200);
  expect((await list()).map((c) => c.id)).toEqual(reversed);
});

it("forbids a non-admin from reordering channels", async () => {
  const { invite } = await mkInvite(app, token, { maxUses: 0 });
  const { token: member } = await json<{ token: string }>(
    await register(app, invite.code, uniq()),
  );
  const ids = (await list()).map((c) => c.id);
  expect(
    (await put(app, "/api/channels/order", { orderedIds: ids }, member)).status,
  ).toBe(403);
});
