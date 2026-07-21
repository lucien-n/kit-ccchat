import { createChannelBody, renameChannelBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as channelsService from "./channels.service.js";

export function list(c: AppContext) {
  return c.json({ channels: channelsService.listChannels() });
}

export function unreads(c: AppContext) {
  return c.json({ unreads: channelsService.unreadCounts(c.get("user")) });
}

export function markRead(c: AppContext<"/:id">) {
  channelsService.markRead(c.get("user").id, c.req.param("id"));
  return c.json({ ok: true });
}

export function create(c: JsonContext<typeof createChannelBody>) {
  return c.json({ channel: channelsService.createChannel(c.req.valid("json")) });
}

export function rename(c: JsonContext<typeof renameChannelBody, "/:id">) {
  const channel = channelsService.renameChannel(
    c.req.param("id"),
    c.req.valid("json").name,
  );
  return c.json({ channel });
}

export function remove(c: AppContext) {
  channelsService.deleteChannel(String(c.req.param("id")));
  return c.json({ ok: true });
}
