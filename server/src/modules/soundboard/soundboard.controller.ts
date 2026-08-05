import type { updateSoundBody, uploadSoundBody } from "@motus/shared";
import { sendBlob } from "../../http/blob.js";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as soundboardService from "./soundboard.service.js";

export function list(c: AppContext) {
  return c.json({ sounds: soundboardService.listSounds() });
}

export function upload(c: JsonContext<typeof uploadSoundBody>) {
  return c.json({
    sound: soundboardService.saveSound(c.get("user").id, c.req.valid("json")),
  });
}

export function get(c: AppContext<"/:id">) {
  return sendBlob(c, soundboardService.readSound(c.req.param("id")));
}

export function update(c: JsonContext<typeof updateSoundBody, "/:id">) {
  return c.json({
    sound: soundboardService.updateSound(
      c.req.param("id"),
      c.get("user").id,
      c.req.valid("json"),
    ),
  });
}

export function remove(c: AppContext<"/:id">) {
  soundboardService.deleteSound(c.req.param("id"), c.get("user").id);
  return c.json({ ok: true });
}
