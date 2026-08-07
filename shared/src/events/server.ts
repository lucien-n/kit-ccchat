import type { Member, MessageView, Reaction, VoiceMember } from "../views";

export enum ServerEventType {
  Message_New = "message_new",
  Message_Edited = "message_edited",
  Message_Deleted = "message_deleted",
  Message_Reacted = "message_reacted",
  Message_Pinned = "message_pinned",
  Presence = "presence",
  Member_Updated = "member_updated",
  Typing_Started = "typing_started",
  Voice_Presence = "voice_presence",
  Community_Renamed = "community_renamed",
  Community_Icon_Changed = "community_icon_changed",
  Roles_Changed = "roles_changed",
  Voice_Moved = "voice_moved",
  Error = "error",
}

export type ServerEvent =
  | {
      type: ServerEventType.Message_New;
      message: MessageView;
    }
  | {
      type: ServerEventType.Message_Edited;
      message: MessageView;
    }
  | {
      type: ServerEventType.Message_Deleted;
      id: string;
      channelId: string;
    }
  | {
      type: ServerEventType.Message_Reacted;
      id: string;
      channelId: string;
      reactions: Reaction[];
    }
  | {
      type: ServerEventType.Message_Pinned;
      id: string;
      channelId: string;
      pinned: boolean;
    }
  | {
      type: ServerEventType.Presence;
      online: string[];
    }
  | {
      type: ServerEventType.Member_Updated;
      member: Member;
    }
  | {
      type: ServerEventType.Typing_Started;
      channelId: string;
      userId: string;
    }
  | {
      type: ServerEventType.Voice_Presence;
      presence: Record<string, VoiceMember[]>;
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
      type: ServerEventType.Voice_Moved;
      channelId: string;
    }
  | {
      type: ServerEventType.Error;
      message: string;
    };
