import {
  MAX_IMAGES_PER_MESSAGE,
  MAX_MESSAGE_IMAGE_BYTES,
  type MessageImage,
  type UploadImageBody,
} from "@ccchat/shared";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { messageImagesTable } from "../../db/schema";
import { IMAGES_DIR } from "../../env.js";
import { decodeImageUpload, imageStore, type StoredImage } from "../../images.js";

const images = imageStore(IMAGES_DIR);

export function readImage(id: string): StoredImage {
  return images.read(id);
}

export function saveImage(uploaderId: string, body: UploadImageBody): MessageImage {
  const bytes = decodeImageUpload(body.image, MAX_MESSAGE_IMAGE_BYTES);
  const id = newId();

  images.write(id, bytes);
  db.insert(messageImagesTable)
    .values({
      id,
      messageId: null,
      uploaderId,
      width: body.width,
      height: body.height,
      createdAt: Date.now(),
    })
    .run();

  return { id, width: body.width, height: body.height };
}

export function imagesOf(messageId: string): MessageImage[] {
  return db
    .select({
      id: messageImagesTable.id,
      width: messageImagesTable.width,
      height: messageImagesTable.height,
    })
    .from(messageImagesTable)
    .where(eq(messageImagesTable.messageId, messageId))
    .all();
}

export function attachImages(messageId: string, uploaderId: string, ids: string[]) {
  if (!ids.length) return;

  db.update(messageImagesTable)
    .set({ messageId })
    .where(
      and(
        inArray(messageImagesTable.id, ids.slice(0, MAX_IMAGES_PER_MESSAGE)),
        eq(messageImagesTable.uploaderId, uploaderId),
        isNull(messageImagesTable.messageId),
      ),
    )
    .run();
}

export function deleteImagesOf(messageId: string) {
  const gone = db
    .delete(messageImagesTable)
    .where(eq(messageImagesTable.messageId, messageId))
    .returning({ id: messageImagesTable.id })
    .all();

  for (const { id } of gone) images.remove(id);
}
