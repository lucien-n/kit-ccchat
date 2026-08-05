import {
  createChannelBody,
  renameChannelBody,
  reorderChannelsBody,
} from "@motus/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as channelsService from "./channels.service.js";

export function list(c: AppContext) {
  return c.json({ channels: channelsService.listChannels() });
}

export function unreads(c: AppContext) {
  return c.json(channelsService.unreadCounts(c.get("user")));
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

export function reorder(c: JsonContext<typeof reorderChannelsBody>) {
  channelsService.reorderChannels(c.req.valid("json").orderedIds);
  return c.json({ ok: true });
}

export function setMain(c: AppContext<"/:id">) {
  const channel = channelsService.setMainChannel(c.req.param("id"));
  return c.json({ channel });
}

export function remove(c: AppContext) {
  channelsService.deleteChannel(String(c.req.param("id")));
  return c.json({ ok: true });
}
