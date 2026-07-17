import { z } from "zod";
import { MESSAGE_MAX_LENGTH } from "./primitives.js";
import { messageView, voiceMember } from "./views.js";

export enum ServerEventType {
  Message_New = "Message_New",
  Message_Deleted = "Message_Deleted",
  Presence = "Presence",
  Voice_Presence = "Voice_Presence",
  Community_Renamed = "Community_Renamed",
  Error = "Error",
}

export type ServerEvent =
  | {
      type: ServerEventType.Message_New;
      message: z.infer<typeof messageView>;
    }
  | {
      type: ServerEventType.Message_Deleted;
      id: string;
      channelId: string;
    }
  | {
      type: ServerEventType.Presence;
      online: string[];
    }
  | {
      type: ServerEventType.Voice_Presence;
      presence: Record<string, z.infer<typeof voiceMember>[]>;
    }
  | {
      type: ServerEventType.Community_Renamed;
      name: string;
    }
  | {
      type: ServerEventType.Error;
      message: string;
    };

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
