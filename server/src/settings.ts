import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { settings } from "./db/schema";
import { COMMUNITY_NAME } from "./env.js";

/** Runtime settings live in the DB so the owner can change them from the UI.
 *  Environment variables only ever provide the *initial* value. */
export function getSetting(key: string): string | null {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

/** Name shown on the login screen and in the client header. Falls back to the
 *  COMMUNITY_NAME env var (for headless installs) and then to a generic default. */
export function communityName(): string {
  return getSetting("communityName") ?? COMMUNITY_NAME;
}
