import type { EditMessageBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as messagesService from "./messages.service.js";

export function history(c: AppContext<"/:channelId">) {
  const before = Number(c.req.query("before"));
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
  return c.json({
    messages: messagesService.history(c.req.param("channelId"), before, limit),
  });
}

export function edit(c: JsonContext<EditMessageBody, "/:id">) {
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
