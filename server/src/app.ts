import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { CLIENT_DIR, IS_PROD } from "./env.js";
import { needsSetup } from "./bootstrap.js";
import { onError } from "./http/errors.js";
import * as settingsService from "./modules/settings/settings.service.js";
import type { Env } from "./auth.js";

import setupRouter from "./modules/setup/setup.router.js";
import settingsRouter from "./modules/settings/settings.router.js";
import authRouter from "./modules/auth/auth.router.js";
import imagesRouter from "./modules/images/images.router.js";
import invitesRouter from "./modules/invites/invites.router.js";
import channelsRouter from "./modules/channels/channels.router.js";
import messagesRouter from "./modules/messages/messages.router.js";
import moderationRouter from "./modules/moderation/moderation.router.js";
import rolesRouter from "./modules/roles/roles.router.js";
import searchRouter from "./modules/search/search.router.js";
import systemRouter from "./modules/system/system.router.js";
import voiceRouter from "./modules/voice/voice.router.js";
import usersRouter from "./modules/users/users.router.js";

// Chained so the schema accumulates into `AppType`.
export const app = new Hono<Env>()
  .onError(onError)
  // Bearer-token auth (no cookies) means cross-origin requests are safe: a
  // permissive CORS policy lets the mobile app and dev client talk to the API.
  .use("/api/*", cors())
  .get("/api/info", (c) =>
    c.json({
      name: settingsService.communityName(),
      needsSetup: needsSetup(),
      iconVersion: settingsService.iconVersion(),
    }),
  )
  .route("/api/setup", setupRouter)
  .route("/api/settings", settingsRouter)
  .route("/api/auth", authRouter)
  .route("/api/invites", invitesRouter)
  .route("/api/channels", channelsRouter)
  .route("/api/images", imagesRouter)
  .route("/api/messages", messagesRouter)
  .route("/api/moderation", moderationRouter)
  .route("/api/roles", rolesRouter)
  .route("/api/search", searchRouter)
  .route("/api/system", systemRouter)
  .route("/api/voice", voiceRouter)
  .route("/api/users", usersRouter);

export type AppType = typeof app;

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
