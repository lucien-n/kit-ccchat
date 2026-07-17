import {
  clientEvent,
  ClientEvenType,
  ServerEventType,
  type ClientEvent,
} from "@ccchat/shared";
import { eq } from "drizzle-orm";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { newId, userForToken } from "./auth.js";
import { db } from "./db/index.js";
import { channels, messages, users } from "./db/schema.js";
import { hub, type Client } from "./hub.js";
import { toMessageView } from "./views.js";

const wss = new WebSocketServer({ noServer: true });

const DEFAULT_HEARTBEAT_MS = 30_000;

/** Sockets that have answered a ping since the last sweep. */
const alive = new WeakMap<WebSocket, boolean>();

/** A browser cannot send WebSocket pings, so liveness has to be probed from
 *  here. Without this, a closed laptop or a dropped network leaves the user
 *  listed as online for everyone else until the OS gives up on the TCP
 *  connection, which can take many minutes or, on a silent drop, never.
 *  `ws` answers pings automatically, so a client that misses a whole round is
 *  gone: terminate it and let the close handler clean up presence. */
function startHeartbeat(everyMs: number) {
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, everyMs);
  // Never hold the process open just to run the sweep.
  timer.unref();
  return timer;
}

/** Hook the WebSocket upgrade onto the shared HTTP server, but only for /ws.
 *  Auth happens here via ?token=... so the same bearer token works for the web
 *  client and the future Capacitor mobile app. */
export function attachWebSocket(server: Server, heartbeatMs = DEFAULT_HEARTBEAT_MS) {
  const heartbeat = startHeartbeat(heartbeatMs);
  server.on("close", () => clearInterval(heartbeat));

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

  alive.set(ws, true);
  ws.on("pong", () => alive.set(ws, true));

  ws.on("message", (raw) => {
    let parsed;
    try {
      parsed = clientEvent.safeParse(JSON.parse(raw.toString()));
    } catch {
      return;
    }
    if (!parsed.success) return;
    const msg = parsed.data;

    switch (msg.type) {
      case ClientEvenType.Message_Create:
        handleCreate(client, msg);
        break;
      case ClientEvenType.Voice_Join:
        handleVoiceJoin(client, msg.channelId);
        break;
      case ClientEvenType.Voice_Leave:
        hub.voiceLeaveAll(client.userId);
        break;
    }
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

function replyTarget(replyToId: string | undefined, channelId: string): string | null {
  if (!replyToId) return null;
  const target = db.select().from(messages).where(eq(messages.id, replyToId)).get();
  if (!target || target.deleted || target.channelId !== channelId) return null;
  return target.id;
}

function handleCreate(
  client: Client,
  msg: Extract<ClientEvent, { type: ClientEvenType.Message_Create }>,
) {
  const u = db.select().from(users).where(eq(users.id, client.userId)).get();
  if (!u) return;
  if (u.banned)
    return hub.send(client, { type: ServerEventType.Error, message: "you are banned" });
  if (u.mutedUntil && u.mutedUntil > Date.now())
    return hub.send(client, { type: ServerEventType.Error, message: "you are muted" });

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
    replyToId: replyTarget(msg.replyToId, channelId),
  };
  db.insert(messages).values(row).run();
  hub.broadcast({ type: ServerEventType.Message_New, message: toMessageView(row) });
}
