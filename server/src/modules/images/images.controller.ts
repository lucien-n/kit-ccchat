import type { uploadImageBody } from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import { sendImage } from "../../http/image.js";
import * as imagesService from "./images.service.js";

export function upload(c: JsonContext<typeof uploadImageBody>) {
  return c.json({
    image: imagesService.saveImage(c.get("user").id, c.req.valid("json")),
  });
}

export function get(c: AppContext<"/:id">) {
  return sendImage(c, imagesService.readImage(c.req.param("id")));
}
