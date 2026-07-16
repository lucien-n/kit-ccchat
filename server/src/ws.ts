import { eq } from "drizzle-orm";
import { clientEvent, type ClientEvent } from "@ccchat/shared";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { newId, userForToken } from "./auth.js";
import { db } from "./db/index.js";
import { channels, messages, users } from "./db/schema.js";
import { hub, type Client } from "./hub.js";
import { toMessageView } from "./views.js";

const wss = new WebSocketServer({ noServer: true });

/** Hook the WebSocket upgrade onto the shared HTTP server, but only for /ws.
 *  Auth happens here via ?token=... so the same bearer token works for the web
 *  client and the future Capacitor mobile app. */
export function attachWebSocket(server: Server) {
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const user = userForToken(url.searchParams.get("token") ?? undefined);
    if (!user || user.banned) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, user.id));
  });
}

function onConnection(ws: WebSocket, userId: string) {
  const client: Client = { ws, userId };
  hub.add(client);

  ws.on("message", (raw) => {
    let parsed;
    try {
      parsed = clientEvent.safeParse(JSON.parse(raw.toString()));
    } catch {
      return;
    }
    if (!parsed.success) return;
    const msg = parsed.data;

    if (msg.type === "message.create") handleCreate(client, msg);
    else if (msg.type === "voice.join") handleVoiceJoin(client, msg.channelId);
    else if (msg.type === "voice.leave") hub.voiceLeaveAll(client.userId);
    // message.delete + moderation go through the REST API for a clean
    // permission model; the hub broadcasts the resulting events to everyone.
  });

  ws.on("close", () => hub.remove(client));
  ws.on("error", () => hub.remove(client));
}

/** A client reports it joined a voice channel; broadcast presence to everyone.
 *  Client-reported (rather than via LiveKit webhooks) so it works identically in
 *  dev and Docker. Disconnect cleanup lives in the hub. */
function handleVoiceJoin(client: Client, channelId: string) {
  const channel = db.select().from(channels).where(eq(channels.id, channelId)).get();
  if (!channel || channel.type !== "voice") return;

  const u = db.select().from(users).where(eq(users.id, client.userId)).get();
  if (!u) return;
  hub.voiceJoin(channelId, {
    id: u.id,
    name: u.displayName,
    avatarVersion: u.avatarVersion ?? null,
  });
}

function handleCreate(
  client: Client,
  msg: Extract<ClientEvent, { type: "message.create" }>,
) {
  // Re-check the user on every send so mute/ban take effect immediately.
  const u = db.select().from(users).where(eq(users.id, client.userId)).get();
  if (!u) return;
  if (u.banned) return hub.send(client, { type: "error", message: "you are banned" });
  if (u.mutedUntil && u.mutedUntil > Date.now())
    return hub.send(client, { type: "error", message: "you are muted" });

  const { channelId, content } = msg;

  const channel = db.select().from(channels).where(eq(channels.id, channelId)).get();
  if (!channel || channel.type !== "text") return;

  const row = {
    id: newId(),
    channelId,
    authorId: client.userId,
    content,
    createdAt: Date.now(),
    editedAt: null,
    deleted: 0,
  };
  db.insert(messages).values(row).run();
  hub.broadcast({ type: "message.new", message: toMessageView(row) });
}
