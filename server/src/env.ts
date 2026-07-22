import { dirname, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(SERVER_DIR, "..");

// Tests must not inherit whatever the developer happens to have in .env - a real
// LIVEKIT_API_SECRET sitting there once made a security guard look like it passed.
if (process.env.NODE_ENV !== "test") {
  // Resolved from this file, not the cwd. Real env vars win; server/.env beats
  // the root .env that docker-compose reads.
  for (const file of [join(SERVER_DIR, ".env"), join(REPO_ROOT, ".env")]) {
    try {
      loadEnvFile(file);
    } catch {
      /* file absent - that's fine */
    }
  }
}

export const PORT = Number(process.env.PORT ?? 8080);
export const DATA_DIR = resolve(process.env.DATA_DIR ?? "./data");
export const CLIENT_DIR = resolve(process.env.CLIENT_DIR ?? "../client/build");

/** Everything ccchat writes inside DATA_DIR. Declared here because the disk
 *  usage panel has to measure what the other modules own. */
export const AVATARS_DIR = join(DATA_DIR, "avatars");
export const IMAGES_DIR = join(DATA_DIR, "images");
export const COMMUNITY_ICON_FILE = join(DATA_DIR, "community-icon");
export const DB_FILE = join(DATA_DIR, "ccchat.sqlite");
export const COMMUNITY_NAME = process.env.COMMUNITY_NAME ?? "My Community";

export const OWNER_USERNAME = process.env.OWNER_USERNAME ?? "owner";
export const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "";

/** The owner is only created on first boot, so changing OWNER_PASSWORD later has
 *  no effect without this. */
export const RESET_OWNER_PASSWORD = process.env.RESET_OWNER_PASSWORD === "1";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

/** The browser connects to LiveKit directly, so this URL must resolve from the
 *  *client*. Empty means "derive it from the request", which is what keeps the
 *  proxied same-origin default working without the self-hoster configuring it.
 *  Set it only for a LiveKit that is not behind our proxy. */
export const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
export const LIVEKIT_PATH = process.env.LIVEKIT_PATH ?? "/livekit";
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "ccchat";

const DEV_LIVEKIT_SECRET = "dev-only-insecure-secret-set-LIVEKIT_API_SECRET";
// `||`, not `??`: an empty LIVEKIT_API_SECRET='' is as insecure as an unset one,
// so it must also fall back to the dev default and be caught by the guard below.
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || DEV_LIVEKIT_SECRET;

if (process.env.NODE_ENV === "production" && LIVEKIT_API_SECRET === DEV_LIVEKIT_SECRET) {
  throw new Error(
    "LIVEKIT_API_SECRET is unset in production. Set it to a strong random value " +
      "(the installer does this for you: openssl rand -hex 32).",
  );
}

export const IS_PROD = process.env.NODE_ENV === "production";
