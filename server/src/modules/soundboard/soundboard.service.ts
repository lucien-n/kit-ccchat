import {
  MAX_SOUNDBOARD_BYTES,
  type Sound,
  type UpdateSoundBody,
  type UploadSoundBody,
} from "@ccchat/shared";
import { desc, eq } from "drizzle-orm";
import { newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { soundboardSoundsTable } from "../../db/schema";
import { SOUNDS_DIR } from "../../env.js";
import { httpError } from "../../http/errors.js";
import { decodeSoundUpload, soundStore, type StoredSound } from "../../sounds.js";

const sounds = soundStore(SOUNDS_DIR);

export function readSound(id: string): StoredSound {
  return sounds.read(id);
}

const toView = (row: typeof soundboardSoundsTable.$inferSelect): Sound => ({
  id: row.id,
  name: row.name,
  emoji: row.emoji,
  uploaderId: row.uploaderId,
  durationMs: row.durationMs,
  createdAt: row.createdAt,
});

export function listSounds(): Sound[] {
  return db
    .select()
    .from(soundboardSoundsTable)
    .orderBy(desc(soundboardSoundsTable.createdAt))
    .all()
    .map(toView);
}

export function saveSound(uploaderId: string, body: UploadSoundBody): Sound {
  const bytes = decodeSoundUpload(body.sound, MAX_SOUNDBOARD_BYTES);
  const id = newId();
  const row = {
    id,
    name: body.name,
    emoji: body.emoji ?? null,
    uploaderId,
    durationMs: body.durationMs,
    createdAt: Date.now(),
  };

  sounds.write(id, bytes);
  db.insert(soundboardSoundsTable).values(row).run();

  return toView(row);
}

export function updateSound(id: string, userId: string, body: UpdateSoundBody): Sound {
  const row = db
    .select()
    .from(soundboardSoundsTable)
    .where(eq(soundboardSoundsTable.id, id))
    .get();
  if (!row) httpError(404, "not found");
  if (row.uploaderId !== userId) httpError(403, "not your sound");

  const updated = { ...row, name: body.name, emoji: body.emoji ?? null };
  db.update(soundboardSoundsTable)
    .set({ name: updated.name, emoji: updated.emoji })
    .where(eq(soundboardSoundsTable.id, id))
    .run();

  return toView(updated);
}

export function deleteSound(id: string, userId: string) {
  const row = db
    .select({ uploaderId: soundboardSoundsTable.uploaderId })
    .from(soundboardSoundsTable)
    .where(eq(soundboardSoundsTable.id, id))
    .get();
  if (!row) httpError(404, "not found");
  if (row.uploaderId !== userId) httpError(403, "not your sound");

  db.delete(soundboardSoundsTable).where(eq(soundboardSoundsTable.id, id)).run();
  sounds.remove(id);
}
