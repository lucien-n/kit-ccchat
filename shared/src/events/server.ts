import z from "zod";
import { messageView, voiceMember } from "../views";

export enum ServerEventType {
  Message_New = "message_new",
  Message_Edited = "message_edited",
  Message_Deleted = "message_deleted",
  Presence = "presence",
  Voice_Presence = "voice_presence",
  Community_Renamed = "community_renamed",
  Community_Icon_Changed = "community_icon_changed",
  Roles_Changed = "roles_changed",
  Error = "error",
}

export type ServerEvent =
  | {
      type: ServerEventType.Message_New;
      message: z.infer<typeof messageView>;
    }
  | {
      type: ServerEventType.Message_Edited;
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
      type: ServerEventType.Community_Icon_Changed;
      /** null once the icon is removed; doubles as a cache-busting version. */
      iconVersion: number | null;
    }
  | {
      type: ServerEventType.Roles_Changed;
    }
  | {
      type: ServerEventType.Error;
      message: string;
    };
