import { renameCommunityBody, ServerEventType } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, requireCan, type Env } from "../auth.js";
import { hub } from "../hub.js";
import { communityName, setSetting } from "../settings.js";
import { validate } from "../validate.js";

const app = new Hono<Env>();

app.use("*", requireAuth);

app.patch(
  "/",
  requireCan("manageCommunity"),
  validate("json", renameCommunityBody),
  async (c) => {
    const name = c.req.valid("json").communityName;

    setSetting("communityName", name);
    hub.broadcast({ type: ServerEventType.Community_Renamed, name });

    return c.json({ communityName: communityName() });
  },
);

export default app;
