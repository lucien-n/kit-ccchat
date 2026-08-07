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

/** Parse a numeric env var, falling back when it is unset, blank, or malformed.
 *  Bare `Number("60m")` yields NaN, which slips past `<= 0` guards and poisons
 *  timers (`setInterval(fn, NaN)` busy-loops), so every knob goes through here. */
function numEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const PORT = Number(process.env.PORT ?? 8080);
export const DATA_DIR = resolve(process.env.DATA_DIR ?? "./data");
export const CLIENT_DIR = resolve(process.env.CLIENT_DIR ?? "../client/build");

/** Everything motus writes inside DATA_DIR. Declared here because the disk
 *  usage panel has to measure what the other modules own. */
export const AVATARS_DIR = join(DATA_DIR, "avatars");
export const BANNERS_DIR = join(DATA_DIR, "banners");
export const SOUNDS_DIR = join(DATA_DIR, "sounds");
export const BACKUPS_DIR = join(DATA_DIR, "backups");

/** Where message attachments (big files included) are written. Kept separate and
 *  independently configurable so a self-hoster can point it at a large external
 *  disk while the database and small assets stay on the primary volume. Resolved
 *  as an absolute path so an external mount like /mnt/ssd/motus works. */
export const ATTACHMENTS_DIR = resolve(
  process.env.ATTACHMENTS_DIR ?? join(DATA_DIR, "attachments"),
);

/** Files larger than this (bytes) get an expiry; smaller ones are kept forever.
 *  Override with ATTACHMENT_TTL_THRESHOLD_MB. */
export const ATTACHMENT_TTL_THRESHOLD_BYTES =
  numEnv(process.env.ATTACHMENT_TTL_THRESHOLD_MB, 25) * 1_000_000;

/** How long a large attachment lives before the sweeper reclaims it. 0 disables
 *  expiry (everything is kept regardless of size). */
export const ATTACHMENT_TTL_DAYS = numEnv(process.env.ATTACHMENT_TTL_DAYS, 30);

/** How often the sweeper scans for expired attachments, in minutes. */
export const ATTACHMENT_SWEEP_INTERVAL_MIN = numEnv(
  process.env.ATTACHMENT_SWEEP_INTERVAL_MIN,
  60,
);
// LINK_EMBEDS=0 disables outbound metadata fetches entirely (self-hoster who
// wants the server to never reach third-party sites).
export const LINK_EMBEDS_ENABLED = process.env.LINK_EMBEDS !== "0";

export const LINK_EMBED_CACHE_MIN = numEnv(process.env.LINK_EMBED_CACHE_MIN, 60);

export const COMMUNITY_ICON_FILE = join(DATA_DIR, "community-icon");
export const DB_FILE = join(DATA_DIR, "motus.sqlite");

/** How often the database is snapshotted into BACKUPS_DIR, in hours. 0 disables
 *  automatic backups (the owner can still trigger one by hand). */
export const BACKUP_INTERVAL_HOURS = Number(process.env.BACKUP_INTERVAL_HOURS ?? 24);
/** How many of the newest backups to keep; older ones are pruned. 0 keeps all. */
export const BACKUP_RETENTION = Number(process.env.BACKUP_RETENTION ?? 7);
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

/** Server-to-LiveKit HTTP endpoint for the management API (muting a member's
 *  mic, etc). Unlike LIVEKIT_URL this never goes through the proxy: it is an
 *  in-cluster call. Defaults to the native dev port; compose points it at the
 *  livekit service. */
export const LIVEKIT_HOST = process.env.LIVEKIT_HOST ?? "http://localhost:7880";
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "motus";

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
