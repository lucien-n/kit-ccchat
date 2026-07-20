import { loginBody, registerBody, type LoginBody } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { rateLimit } from "../../ratelimit.js";
import { validate } from "../../validate.js";
import * as authController from "./auth.controller.js";

const router = new Hono<Env>();

router.post(
  "/register",
  rateLimit({ limit: 20, windowMs: 60_000 }),
  validate("json", registerBody),
  authController.register,
);

// Each attempt costs a scrypt hash and buys a guess, so two independent limits:
// one address flooding us (loose - a CGNAT is many honest people), and one
// account being guessed at (tight, and IP-independent so a botnet buys nothing).
const loginFlood = rateLimit({ limit: 30, windowMs: 60_000 });
const loginGuess = rateLimit({
  limit: 8,
  windowMs: 60_000,
  // Hono only types valid() for a route's own handler, not a shared middleware.
  keys: (c) => [`user:${(c.req.valid("json" as never) as LoginBody).username}`],
  message: "too many login attempts for this account, wait a minute",
});

router.post(
  "/login",
  loginFlood,
  validate("json", loginBody),
  loginGuess,
  authController.login,
);

router.post("/logout", requireAuth, authController.logout);

router.get("/me", requireAuth, authController.me);

export default router;
