import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { CLIENT_DIR, IS_PROD } from "./env.js";
import { needsSetup } from "./bootstrap.js";
import { communityName } from "./settings.js";
import type { Env } from "./auth.js";

import setupRoutes from "./routes/setup.js";
import settingsRoutes from "./routes/settings.js";
import authRoutes from "./routes/auth.js";
import inviteRoutes from "./routes/invites.js";
import channelRoutes from "./routes/channels.js";
import messageRoutes from "./routes/messages.js";
import moderationRoutes from "./routes/moderation.js";
import roleRoutes from "./routes/roles.js";
import voiceRoutes from "./routes/voice.js";
import userRoutes from "./routes/users.js";

export const app = new Hono<Env>();

// Bearer-token auth (no cookies) means cross-origin requests are safe: a
// permissive CORS policy lets the mobile app and dev client talk to the API.
app.use("/api/*", cors());

app.get("/api/info", (c) => c.json({ name: communityName(), needsSetup: needsSetup() }));

app.route("/api/setup", setupRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/invites", inviteRoutes);
app.route("/api/channels", channelRoutes);
app.route("/api/messages", messageRoutes);
app.route("/api/moderation", moderationRoutes);
app.route("/api/roles", roleRoutes);
app.route("/api/voice", voiceRoutes);
app.route("/api/users", userRoutes);

// In production the server also serves the built SPA. In dev the client runs on
// Vite (port 5173) and proxies /api + /ws here, so this branch is skipped.
if (IS_PROD && existsSync(CLIENT_DIR)) {
  const root = relative(process.cwd(), CLIENT_DIR) || ".";
  app.use("/*", serveStatic({ root }));
  // SPA fallback: any non-API, non-file route returns index.html.
  const indexHtml = join(CLIENT_DIR, "index.html");
  app.get("/*", (c) => {
    if (existsSync(indexHtml)) return c.html(readFileSync(indexHtml, "utf8"));
    return c.text("client not built", 404);
  });
}
