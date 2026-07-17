import { z } from "zod";
import { MESSAGE_MAX_LENGTH } from "./primitives.js";
import { messageView, voiceMember } from "./views.js";

export type ServerEvent =
  | { type: "message.new"; message: z.infer<typeof messageView> }
  | { type: "message.deleted"; id: string; channelId: string }
  | { type: "presence"; online: string[] }
  | { type: "voice.presence"; presence: Record<string, z.infer<typeof voiceMember>[]> }
  | { type: "community.renamed"; name: string }
  | { type: "error"; message: string };

export const clientEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message.create"),
    channelId: z.string().min(1),
    content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
    replyToId: z.string().min(1).optional(),
  }),
  z.object({ type: z.literal("voice.join"), channelId: z.string().min(1) }),
  z.object({ type: z.literal("voice.leave") }),
]);
export type ClientEvent = z.infer<typeof clientEvent>;
