import z from "zod";
import { messageView, voiceMember } from "../views";

export enum ServerEventType {
  Message_New = "message_new",
  Message_Deleted = "message_deleted",
  Presence = "presence",
  Voice_Presence = "voice_presence",
  Community_Renamed = "community_renamed",
  Roles_Changed = "roles_changed",
  Error = "error",
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
      // Roles or their assignments changed. Clients refetch roles + members;
      // affected sessions refetch /me so their own color/permission updates.
      type: ServerEventType.Roles_Changed;
    }
  | {
      type: ServerEventType.Error;
      message: string;
    };
