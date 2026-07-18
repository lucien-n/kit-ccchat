import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db/index.js";
import { sessions, users, type User } from "./db/schema";
import { SESSION_TTL_MS } from "./env.js";
import { isAdmin, isOwner } from "./permissions.js";

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

/** Named capabilities are the seam for future fine-grained permissions: today
 *  they all resolve to owner/admin, but when roles carry granular powers only
 *  `can`'s body changes - every call site already reads by intent. */
export type Capability =
  | "manageChannels"
  | "moderateMembers"
  | "manageInvites"
  | "manageRoles"
  | "deleteAnyMessage"
  | "manageCommunity";

const OWNER_ONLY = new Set<Capability>(["manageCommunity"]);

export function can(user: User, cap: Capability): boolean {
  if (OWNER_ONLY.has(cap)) return isOwner(user);
  return isAdmin(user);
}

/** Require a capability (use after requireAuth). */
export function requireCan(cap: Capability) {
  return async (c: Context<Env>, next: Next) => {
    if (!can(c.get("user"), cap)) return c.json({ error: "forbidden" }, 403);
    await next();
  };
}
