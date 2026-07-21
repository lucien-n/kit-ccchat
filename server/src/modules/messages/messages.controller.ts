import { editMessageBody, messageAroundQuery, messageHistoryQuery } from "@ccchat/shared";
import type { AppContext, JsonContext, QueryContext } from "../../http/context.js";
import { httpError } from "../../http/errors.js";
import * as messagesService from "./messages.service.js";

export function history(c: QueryContext<typeof messageHistoryQuery, "/:channelId">) {
  return c.json({
    messages: messagesService.history(c.req.param("channelId"), c.req.valid("query")),
  });
}

export function around(
  c: QueryContext<typeof messageAroundQuery, "/:channelId/around/:messageId">,
) {
  const window = messagesService.around(
    c.req.param("channelId"),
    c.req.param("messageId"),
    c.req.valid("query").limit,
  );
  if (!window) return httpError(404, "not found");
  return c.json(window);
}

export function edit(c: JsonContext<typeof editMessageBody, "/:id">) {
  const message = messagesService.editMessage(
    c.req.param("id"),
    c.get("user"),
    c.req.valid("json"),
  );
  return c.json({ message });
}

export function remove(c: AppContext<"/:id">) {
  messagesService.deleteMessage(c.req.param("id"), c.get("user"));
  return c.json({ ok: true });
}
