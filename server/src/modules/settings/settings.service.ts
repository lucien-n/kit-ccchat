import { ServerEventType } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { settings } from "../../db/schema";
import { COMMUNITY_NAME } from "../../env.js";
import { hub } from "../../hub.js";

/** The closed set of keys the settings table accepts. Values are the stored
 *  column contents, so renaming one is a migration, not a refactor. */
export enum SettingKey {
  CommunityName = "communityName",
}

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

export function renameCommunity(name: string) {
  setSetting(SettingKey.CommunityName, name);
  hub.broadcast({ type: ServerEventType.Community_Renamed, name });
}
