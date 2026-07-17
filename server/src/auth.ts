import { Role } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db/index.js";
import { sessions, users, type User } from "./db/schema";
import { SESSION_TTL_MS } from "./env.js";

/** Password hashing with Node's built-in scrypt - no native modules to compile,
 *  works the same on every platform. Format: <saltHex>:<keyHex>. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const key = Buffer.from(keyHex, "hex");
  const check = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return key.length === check.length && timingSafeEqual(key, check);
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function newId(): string {
  return randomUUID();
}

export function createSession(userId: string): string {
  const token = randomToken(32);
  const now = Date.now();
  db.insert(sessions)
    .values({ token, userId, createdAt: now, expiresAt: now + SESSION_TTL_MS })
    .run();
  return token;
}

export function destroySession(token: string): void {
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

export function userForToken(token: string | undefined): User | null {
  if (!token) return null;

  const session = db.select().from(sessions).where(eq(sessions.token, token)).get();
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    db.delete(sessions).where(eq(sessions.token, token)).run();
    return null;
  }
  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user || user.banned) return null;
  return user;
}

// ── Hono glue ────────────────────────────────────────────────────────────────

export type Env = { Variables: { user: User } };

function bearer(c: Context): string | undefined {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

/** Require a valid session; attaches the user to the context. */
export async function requireAuth(c: Context<Env>, next: Next) {
  const user = userForToken(bearer(c));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  c.set("user", user);
  await next();
}

const RANK: Record<Role, number> = {
  [Role.Member]: 0,
  [Role.Admin]: 1,
  [Role.Owner]: 2,
};

/** `role` is a plain TEXT column, so an unrecognised value has to mean something.
 *  It ranks below everyone: a hand-edited database fails closed. */
export function rankOf(user: User): number {
  return RANK[user.role as Role] ?? -1;
}

export function hasRole(user: User, min: Role): boolean {
  return rankOf(user) >= RANK[min];
}

/** Require at least the given role (use after requireAuth). */
export function requireRole(min: Role) {
  return async (c: Context<Env>, next: Next) => {
    const user = c.get("user");
    if (!hasRole(user, min)) return c.json({ error: "forbidden" }, 403);
    await next();
  };
}
