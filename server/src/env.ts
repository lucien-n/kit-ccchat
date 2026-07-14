import { resolve } from 'node:path';

/** All runtime configuration lives here. Everything is overridable via env vars
 *  so a self-hoster only has to set a couple of things (see .env.example). */
export const PORT = Number(process.env.PORT ?? 8080);

/** Where the SQLite file (and future uploads) live. Mounted as a Docker volume. */
export const DATA_DIR = resolve(process.env.DATA_DIR ?? './data');

/** Built SPA served in production. In dev the client runs on Vite instead. */
export const CLIENT_DIR = resolve(process.env.CLIENT_DIR ?? '../client/build');

/** Display name of this community (shown in the client header). */
export const COMMUNITY_NAME = process.env.COMMUNITY_NAME ?? 'My Community';

/** First-boot owner account. If no password is given, a random one is generated
 *  and printed to the console once. */
export const OWNER_USERNAME = process.env.OWNER_USERNAME ?? 'owner';
export const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? '';

/** Session lifetime. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// ── Voice (LiveKit SFU) ──────────────────────────────────────────────────────
// The backend only mints join tokens; the browser connects to LiveKit directly,
// so LIVEKIT_URL must be reachable *from the client* (localhost in dev, your
// public host/domain in production). Keys must match the livekit.yaml config.
export const LIVEKIT_URL = process.env.LIVEKIT_URL ?? 'ws://localhost:7880';
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey';
export const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET ?? 'devsecret_change_me_min_32_chars_long';

export const IS_PROD = process.env.NODE_ENV === 'production';
