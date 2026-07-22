import {
  MAX_AVATAR_IMAGE_BYTES,
  ServerEventType,
  type CommunityIconBody,
} from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { db } from "../../db/index.js";
import { settingsTable } from "../../db/schema";
import { COMMUNITY_ICON_FILE, COMMUNITY_NAME } from "../../env.js";
import { httpError } from "../../http/errors.js";
import { hub } from "../../hub.js";
import { decodeImageUpload, readImageFile, type StoredImage } from "../../images.js";

/** The closed set of keys the settings table accepts. Values are the stored
 *  column contents, so renaming one is a migration, not a refactor. */
export enum SettingKey {
  CommunityName = "communityName",
  CommunityIconVersion = "communityIconVersion",
}

/** Runtime settings live in the DB so the owner can change them from the UI.
 *  Environment variables only ever provide the *initial* value. */
export function getSetting(key: SettingKey): string | null {
  return (
    db.select().from(settingsTable).where(eq(settingsTable.key, key)).get()?.value ?? null
  );
}

export function setSetting(key: SettingKey, value: string) {
  db.insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } })
    .run();
}

/** Name shown on the login screen and in the client header. Falls back to the
 *  COMMUNITY_NAME env var (for headless installs) and then to a generic default. */
export function communityName(): string {
  return getSetting(SettingKey.CommunityName) ?? COMMUNITY_NAME;
}

export function deleteSetting(key: SettingKey) {
  db.delete(settingsTable).where(eq(settingsTable.key, key)).run();
}

export function renameCommunity(name: string) {
  setSetting(SettingKey.CommunityName, name);
  hub.broadcast({ type: ServerEventType.Community_Renamed, name });
}

/** Doubles as a cache-busting version for the icon URL. null = no icon set, so
 *  clients fall back to the bundled favicon. */
export function iconVersion(): number | null {
  const raw = getSetting(SettingKey.CommunityIconVersion);
  return raw ? Number(raw) : null;
}

export function readIcon(): StoredImage {
  const image = readImageFile(COMMUNITY_ICON_FILE);
  if (!image) httpError(404, "not found");
  return image;
}

export function setIcon({ image }: CommunityIconBody): number {
  writeFileSync(COMMUNITY_ICON_FILE, decodeImageUpload(image, MAX_AVATAR_IMAGE_BYTES));
  const version = Date.now();
  setSetting(SettingKey.CommunityIconVersion, String(version));
  hub.broadcast({
    type: ServerEventType.Community_Icon_Changed,
    iconVersion: version,
  });
  return version;
}

export function clearIcon() {
  if (existsSync(COMMUNITY_ICON_FILE)) rmSync(COMMUNITY_ICON_FILE);
  deleteSetting(SettingKey.CommunityIconVersion);
  hub.broadcast({ type: ServerEventType.Community_Icon_Changed, iconVersion: null });
}
