import { Hono } from "hono";
import { requireAuth, requireOwner, type Env } from "../auth.js";
import { collectSystemStats } from "../system.js";

const app = new Hono<Env>();

app.use("*", requireAuth, requireOwner);

app.get("/", async (c) => c.json({ stats: await collectSystemStats() }));

export default app;
