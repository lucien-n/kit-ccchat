import { Hono } from "hono";
import { renameCommunityBody } from "@ccchat/shared";
import { requireAuth, requireRole, type Env } from "../auth.js";
import { communityName, setSetting } from "../settings.js";
import { hub } from "../hub.js";
import { validate } from "../validate.js";

const app = new Hono<Env>();

app.use("*", requireAuth);

app.patch("/", requireRole("owner"), validate("json", renameCommunityBody), async (c) => {
  const name = c.req.valid("json").communityName;

  setSetting("communityName", name);
  hub.broadcast({ type: "community.renamed", name });

  return c.json({ communityName: communityName() });
});

export default app;
