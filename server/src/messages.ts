import { ChannelType, ServerEventType, type SystemEvent } from "@ccchat/shared";
import { asc, eq } from "drizzle-orm";
import { newId } from "./auth.js";
import { db } from "./db/index.js";
import { channels, messages } from "./db/schema";
import { hub } from "./hub.js";
import { toMessageView } from "./views.js";

/** Post a system line (e.g. "member joined") to the first text channel and push
 *  it to everyone. `subjectId` is the user the event is about; the client reads
 *  it off the message author. No-op if there is no text channel to post to. */
export function postSystemMessage(event: SystemEvent, subjectId: string) {
  const channel = db
    .select()
    .from(channels)
    .where(eq(channels.type, ChannelType.Text))
    .orderBy(asc(channels.position), asc(channels.createdAt))
    .get();
  if (!channel) return;

  const row = {
    id: newId(),
    channelId: channel.id,
    authorId: subjectId,
    content: "",
    createdAt: Date.now(),
    editedAt: null,
    deleted: 0,
    replyToId: null,
    systemEvent: event,
  };
  db.insert(messages).values(row).run();
  hub.broadcast({ type: ServerEventType.Message_New, message: toMessageView(row) });
}
