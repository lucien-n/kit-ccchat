import { setupBody } from "@ccchat/shared";
import { Hono } from "hono";
import { createSession, type Env } from "../auth.js";
import { needsSetup, seedCommunity } from "../bootstrap.js";
import { rateLimit } from "../ratelimit.js";
import { validate } from "../validate.js";
import { toPublicUser } from "../views.js";

const app = new Hono<Env>();

// Guards against two requests racing to claim a brand-new instance. needsSetup()
// only flips once the owner row is committed, so without this both could pass the
// check. Node is single-threaded, so a plain flag is enough.
let claiming = false;

/** Open only while the database has no users - the moment an owner exists this
 *  returns 409 forever. That is the whole security model, so a public instance
 *  must be set up promptly after first boot. */
// Open to the internet on a fresh box until someone claims it. Limited so that
// window can't be ground on, and so the 409 afterwards is cheap to serve.
app.post(
  "/",
  rateLimit({ limit: 5, windowMs: 60_000 }),
  validate("json", setupBody),
  async (c) => {
    if (claiming || !needsSetup())
      return c.json({ error: "this community is already set up" }, 409);

    const { communityName, username, password } = c.req.valid("json");
    const displayName = c.req.valid("json").displayName || username;

    claiming = true;
    try {
      const { owner, inviteCode } = seedCommunity({
        communityName,
        username,
        displayName,
        password,
      });
      const token = createSession(owner.id);
      return c.json({
        token,
        user: toPublicUser(owner),
        inviteCode,
        communityName,
      });
    } finally {
      claiming = false;
    }
  },
);

export default app;
