import { serve } from "@hono/node-server";
import { PORT } from "./env.js";
import { migrate } from "./db/index.js";
import { bootstrap } from "./bootstrap.js";
import { startSystemSampler } from "./system.js";
import { attachWebSocket } from "./ws.js";
import { app } from "./app.js";

migrate();
bootstrap();
startSystemSampler();

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`ccchat server listening on http://localhost:${info.port}`);
});

attachWebSocket(server as unknown as import("node:http").Server);
