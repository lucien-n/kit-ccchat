import { loginBody, registerBody, type LoginBody } from "@ccchat/shared";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  createSession,
  destroySession,
  hashPassword,
  newId,
  requireAuth,
  verifyPassword,
  type Env,
} from "../auth.js";
import { db } from "../db/index.js";
import { invites, users } from "../db/schema.js";
import { rateLimit } from "../ratelimit.js";
import { validate } from "../validate.js";
import { toPublicUser } from "../views.js";

const app = new Hono<Env>();

const publicUser = toPublicUser;

app.post(
  "/register",
  rateLimit({ limit: 20, windowMs: 60_000 }),
  validate("json", registerBody),
  async (c) => {
    const { inviteCode, username, password } = c.req.valid("json");
    const displayName = c.req.valid("json").displayName || username;

    const invite = db.select().from(invites).where(eq(invites.code, inviteCode)).get();
    if (!invite || invite.revoked) return c.json({ error: "invalid invite code" }, 400);
    if (invite.expiresAt && invite.expiresAt < Date.now())
      return c.json({ error: "invite code expired" }, 400);
    if (invite.maxUses !== 0 && invite.uses >= invite.maxUses)
      return c.json({ error: "invite code already used up" }, 400);

    const existing = db.select().from(users).where(eq(users.username, username)).get();
    if (existing) return c.json({ error: "username taken" }, 409);

    const user = {
      id: newId(),
      username,
      displayName,
      passwordHash: hashPassword(password),
      role: "member",
      createdAt: Date.now(),
      banned: 0,
    };
    // One transaction: an account must never come into existence without its
    // invite being counted, or a single-use link would let a second person in.
    db.transaction((tx) => {
      tx.insert(users).values(user).run();
      tx.update(invites)
        .set({ uses: sql`${invites.uses} + 1` })
        .where(eq(invites.code, inviteCode))
        .run();
    });

    const token = createSession(user.id);
    return c.json({ token, user: publicUser(user) });
  },
);

// The endpoint worth attacking: each attempt costs a scrypt hash and buys the
// caller a guess. Two limits, because they defend different things:

// One address flooding us. Loose, because a household or CGNAT is many honest
// people behind one IP, but capped so nobody grinds scrypt for free.
const loginFlood = rateLimit({ limit: 30, windowMs: 60_000 });

// One account being guessed at. Tight, and independent of where it comes from,
// so spreading the attempt across a botnet buys no extra guesses.
const loginGuess = rateLimit({
  limit: 8,
  windowMs: 60_000,
  // Mounted after the validator, so the body is parsed and on the context by
  // now. Hono only types valid() for a route's own handler, not for a shared
  // middleware, hence the cast.
  keys: (c) => [`user:${(c.req.valid("json" as never) as LoginBody).username}`],
  message: "too many login attempts for this account, wait a minute",
});

app.post("/login", loginFlood, validate("json", loginBody), loginGuess, async (c) => {
  const { username, password } = c.req.valid("json");

  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user || !verifyPassword(password, user.passwordHash))
    return c.json({ error: "invalid username or password" }, 401);
  if (user.banned) return c.json({ error: "account banned" }, 403);

  const token = createSession(user.id);
  return c.json({ token, user: publicUser(user) });
});

app.post("/logout", requireAuth, async (c) => {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) destroySession(header.slice(7));
  return c.json({ ok: true });
});

app.get("/me", requireAuth, (c) => c.json({ user: publicUser(c.get("user")) }));

export default app;
