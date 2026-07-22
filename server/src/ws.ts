import {
  ChannelType,
  clientEvent,
  ClientEventType,
  isMuted,
  ServerEventType,
  TYPING_THROTTLE_MS,
  type ClientEvent,
} from "@ccchat/shared";
import { eq } from "drizzle-orm";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { newId, userForToken } from "./auth.js";
import { db } from "./db/index.js";
import { channelsTable, messagesTable, usersTable } from "./db/schema";
import { hub, type Client } from "./hub.js";
import { attachImages } from "./modules/images/images.service.js";
import { resolveMentions, saveMentions } from "./modules/messages/mentions.js";
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
      case ClientEventType.Message_Create:
        handleCreate(client, msg);
        break;
      case ClientEventType.Typing_Start:
        handleTyping(client, msg.channelId);
        break;
      case ClientEventType.Voice_Join:
        handleVoiceJoin(client, msg.channelId);
        break;
      case ClientEventType.Voice_Leave:
        hub.voiceLeaveAll(client.userId);
        break;
      case ClientEventType.Screen_Share_Set:
        hub.setSharing(client.userId, msg.sharing);
        break;
    }
  });

  ws.on("close", () => hub.remove(client));
  ws.on("error", () => hub.remove(client));
}

/** Last relayed typing event per socket, for the flood guard below. */
const lastTyping = new WeakMap<WebSocket, number>();

// The client throttles to TYPING_THROTTLE_MS, so anything arriving much faster
// than that is a client we did not write. The slack keeps a heartbeat that was
// merely delayed in flight from being mistaken for one.
const TYPING_MIN_GAP_MS = TYPING_THROTTLE_MS - 500;

/** Pure relay: who is typing is never stored here. Receivers expire what they
 *  are shown after TYPING_TIMEOUT_MS, which is what makes a client that vanishes
 *  mid-sentence self-healing rather than a stuck indicator for everyone else. */
function handleTyping(client: Client, channelId: string) {
  const now = Date.now();
  if (now - (lastTyping.get(client.ws) ?? 0) < TYPING_MIN_GAP_MS) return;

  // Same gate as posting: someone who cannot send a message must not be
  // advertised as about to send one.
  const u = db.select().from(usersTable).where(eq(usersTable.id, client.userId)).get();
  if (!u || u.banned) return;
  if (u.mutedUntil && u.mutedUntil > now) return;

  const channel = db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .get();
  if (!channel || channel.type !== ChannelType.Text) return;

  lastTyping.set(client.ws, now);
  hub.broadcast({
    type: ServerEventType.Typing_Started,
    channelId,
    userId: client.userId,
  });
}

function handleVoiceJoin(client: Client, channelId: string) {
  const channel = db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .get();
  if (!channel || channel.type !== ChannelType.Voice) return;

  const u = db.select().from(usersTable).where(eq(usersTable.id, client.userId)).get();
  if (!u) return;
  hub.voiceJoin(channelId, {
    id: u.id,
    displayName: u.displayName,
    avatarVersion: u.avatarVersion ?? null,
    sharing: false,
  });
}

function replyTarget(replyToId: string | undefined, channelId: string): string | null {
  if (!replyToId) return null;
  const target = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, replyToId))
    .get();
  if (!target || target.deleted || target.channelId !== channelId) return null;
  return target.id;
}

function handleCreate(
  client: Client,
  msg: Extract<ClientEvent, { type: ClientEventType.Message_Create }>,
) {
  const user = db.select().from(usersTable).where(eq(usersTable.id, client.userId)).get();
  if (!user) {
    return;
  }
  if (user.banned) {
    return hub.send(client, { type: ServerEventType.Error, message: "you are banned" });
  }
  if (isMuted(user)) {
    return hub.send(client, { type: ServerEventType.Error, message: "you are muted" });
  }

  const { channelId, content } = msg;
  const imageIds = msg.imageIds ?? [];
  if (!content && !imageIds.length) return;

  const channel = db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .get();
  if (!channel || channel.type !== ChannelType.Text) return;

  const { userIds, everyone } = resolveMentions(content, client.userId);
  const row = {
    id: newId(),
    channelId,
    authorId: client.userId,
    content,
    createdAt: Date.now(),
    editedAt: null,
    deleted: 0,
    replyToId: replyTarget(msg.replyToId, channelId),
    systemEvent: null,
    mentionsEveryone: everyone ? 1 : 0,
  };
  db.insert(messagesTable).values(row).run();
  saveMentions(row.id, userIds);
  attachImages(row.id, client.userId, imageIds);
  hub.broadcast({ type: ServerEventType.Message_New, message: toMessageView(row) });
}
