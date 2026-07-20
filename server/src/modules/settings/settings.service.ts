import { ServerEventType, type CommunityIconBody } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../../db/index.js";
import { settings } from "../../db/schema";
import { COMMUNITY_NAME, DATA_DIR } from "../../env.js";
import { httpError } from "../../http/errors.js";
import { decodeImageUpload, readImageFile, type StoredImage } from "../../images.js";
import { hub } from "../../hub.js";

/** The closed set of keys the settings table accepts. Values are the stored
 *  column contents, so renaming one is a migration, not a refactor. */
export enum SettingKey {
  CommunityName = "communityName",
  CommunityIconVersion = "communityIconVersion",
}

// One community, one icon, so a fixed path rather than a directory.
const ICON_PATH = join(DATA_DIR, "community-icon");

/** Runtime settings live in the DB so the owner can change them from the UI.
 *  Environment variables only ever provide the *initial* value. */
export function getSetting(key: SettingKey): string | null {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}

export function setSetting(key: SettingKey, value: string) {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

/** Name shown on the login screen and in the client header. Falls back to the
 *  COMMUNITY_NAME env var (for headless installs) and then to a generic default. */
export function communityName(): string {
  return getSetting(SettingKey.CommunityName) ?? COMMUNITY_NAME;
}

export function deleteSetting(key: SettingKey) {
  db.delete(settings).where(eq(settings.key, key)).run();
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
  const image = readImageFile(ICON_PATH);
  if (!image) httpError(404, "not found");
  return image;
}

export function setIcon({ image }: CommunityIconBody): number {
  writeFileSync(ICON_PATH, decodeImageUpload(image));
  const version = Date.now();
  setSetting(SettingKey.CommunityIconVersion, String(version));
  hub.broadcast({
    type: ServerEventType.Community_Icon_Changed,
    iconVersion: version,
  });
  return version;
}

export function clearIcon() {
  if (existsSync(ICON_PATH)) rmSync(ICON_PATH);
  deleteSetting(SettingKey.CommunityIconVersion);
  hub.broadcast({ type: ServerEventType.Community_Icon_Changed, iconVersion: null });
}
