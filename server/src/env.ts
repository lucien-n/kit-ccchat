import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

// Node does not read .env automatically. Load it ourselves, resolved relative to
// THIS file (not the cwd) so it works no matter where the server is started
// from. Real environment variables always win, and server/.env (if present)
// overrides the shared root .env — the same root file docker-compose reads.
const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(SERVER_DIR, '..');
for (const file of [join(SERVER_DIR, '.env'), join(REPO_ROOT, '.env')]) {
  try {
    loadEnvFile(file);
  } catch {
    /* file absent — that's fine */
  }
}

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

/** The owner is only created on FIRST boot. Set RESET_OWNER_PASSWORD=1 to also
 *  force the existing owner's password back to OWNER_PASSWORD on startup —
 *  useful when you've lost it. Unset it again afterwards. */
export const RESET_OWNER_PASSWORD = process.env.RESET_OWNER_PASSWORD === '1';

/** Session lifetime. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// ── Voice (LiveKit SFU) ──────────────────────────────────────────────────────
// The backend only mints join tokens; the browser connects to LiveKit directly,
// so the URL it is given must be reachable *from the client*. Rather than make
// the self-hoster configure that (the classic "works on my machine" trap), the
// reverse proxy exposes LiveKit under LIVEKIT_PATH on the *same origin* as the
// app, and we derive the URL from the request the browser just made. Set
// LIVEKIT_URL only to point at a LiveKit that is NOT behind our proxy.
export const LIVEKIT_URL = process.env.LIVEKIT_URL ?? '';
export const LIVEKIT_PATH = process.env.LIVEKIT_PATH ?? '/livekit';
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'ccchat';

// A weak, well-known fallback so `npm run dev` works with zero setup. It must
// never reach production: anyone could read it here and mint voice tokens. The
// installer generates a real one; the guard below refuses to start without it.
const DEV_LIVEKIT_SECRET = 'dev-only-insecure-secret-set-LIVEKIT_API_SECRET';
// `||`, not `??`: an empty LIVEKIT_API_SECRET='' is as insecure as an unset one,
// so it must also fall back to the dev default and be caught by the guard below.
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || DEV_LIVEKIT_SECRET;

if (process.env.NODE_ENV === 'production' && LIVEKIT_API_SECRET === DEV_LIVEKIT_SECRET) {
  throw new Error(
    'LIVEKIT_API_SECRET is unset in production. Set it to a strong random value ' +
      '(the installer does this for you: openssl rand -hex 32).',
  );
}

export const IS_PROD = process.env.NODE_ENV === 'production';
