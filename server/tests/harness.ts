import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Hono } from 'hono';

// This runs at import time, before any dynamic import of the db — which builds
// its SQLite handle from DATA_DIR at *its* import time. Statically importing the
// app here instead would open the developer's real database.
process.env.NODE_ENV = 'test';
process.env.LIVEKIT_API_SECRET = 'test-only-secret-not-a-real-one';
process.env.COMMUNITY_NAME = 'Test Community';

const DIR = mkdtempSync(join(tmpdir(), 'ccchat-test-'));
process.env.DATA_DIR = DIR;

export async function boot(): Promise<Hono<any>> {
  const { migrate } = await import('../src/db/index.js');
  migrate();
  const { app } = await import('../src/app.js');
  return app as unknown as Hono<any>;
}

export async function cleanup() {
  const { closeDb } = await import('../src/db/index.js');
  closeDb();
  // Best-effort: a stranded temp dir is not worth failing a green run over.
  try {
    rmSync(DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  } catch {
    /* the OS will get it */
  }
}

const JSONH = { 'content-type': 'application/json' };

/** Response.json() is typed `unknown` under Node's fetch types. Tests assert on
 *  shapes the server owns, so this is the one place that opts out. */
export const json = <T = any>(res: Response): Promise<T> => res.json() as Promise<T>;

// async, not a bare return: app.request() is typed `Response | Promise<Response>`
// and that union has no .then(), which every caller here wants.
export async function post(
  app: Hono<any>,
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: token ? { ...JSONH, authorization: `Bearer ${token}` } : JSONH,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function get(app: Hono<any>, path: string, token?: string): Promise<Response> {
  return app.request(path, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

/** Claim the instance and return the owner's token. One shot per database. */
export async function claim(app: Hono<any>, username = 'owner') {
  const res = await post(app, '/api/setup', {
    communityName: 'Test Community',
    username,
    password: 'ownerpass123',
  });
  if (res.status !== 200) throw new Error(`setup failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { token: string; inviteCode: string };
}

export function mkInvite(app: Hono<any>, token: string, body: Record<string, unknown> = {}) {
  return post(app, '/api/invites', body, token).then(json);
}

export function register(app: Hono<any>, inviteCode: string, username: string) {
  return post(app, '/api/auth/register', { inviteCode, username, password: 'joinpass123' });
}

let n = 0;
export const uniq = () => `u${Date.now().toString(36)}${n++}`;
