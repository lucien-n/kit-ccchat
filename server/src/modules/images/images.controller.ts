import type { uploadImageBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import { sendBlob } from "../../http/blob.js";
import * as imagesService from "./images.service.js";

export function upload(c: JsonContext<typeof uploadImageBody>) {
  return c.json({
    image: imagesService.saveImage(c.get("user").id, c.req.valid("json")),
  });
}

export function get(c: AppContext<"/:id">) {
  return sendBlob(c, imagesService.readImage(c.req.param("id")));
}
