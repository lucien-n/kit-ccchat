import type { EditMessageBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import { httpError } from "../../http/errors.js";
import * as messagesService from "./messages.service.js";

export function history(c: AppContext<"/:channelId">) {
  const positive = (v: string | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  return c.json({
    messages: messagesService.history(c.req.param("channelId"), {
      before: positive(c.req.query("before")),
      after: positive(c.req.query("after")),
      limit: Math.min(Number(c.req.query("limit")) || 50, 100),
    }),
  });
}

export function around(c: AppContext<"/:channelId/around/:messageId">) {
  const limit = Math.min(Number(c.req.query("limit")) || 25, 100);
  const window = messagesService.around(
    c.req.param("channelId"),
    c.req.param("messageId"),
    limit,
  );
  if (!window) return httpError(404, "not found");
  return c.json(window);
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
