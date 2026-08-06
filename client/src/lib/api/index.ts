import { attachments } from "./attachments";
import { auth } from "./auth";
import { channels } from "./channels";
import { community } from "./community";
import { invites } from "./invites";
import { messages } from "./messages";
import { moderation } from "./moderation";
import { roles } from "./roles";
import { search } from "./search";
import { soundboard } from "./soundboard";
import { system } from "./system";
import { users } from "./users";
import { voice } from "./voice";

export const api = {
  attachments,
  auth,
  channels,
  community,
  invites,
  messages,
  moderation,
  roles,
  search,
  soundboard,
  system,
  users,
  voice,
};

export { communityIconUrl } from "./community";
export { attachmentUrl } from "./attachments";
export { soundUrl } from "./soundboard";
export { apiBase, ApiError } from "./http";
export { ModAction, type ModOptions } from "./moderation";
export { DeleteSpan } from "@motus/shared";
export { authToken } from "./token.svelte";
export { avatarUrl, bannerUrl } from "./users";

export type {
  Channel,
  Invite,
  Member,
  MessageAttachment,
  MessageView,
  ModeratedMember,
  Role,
  SearchHit,
  Sound,
  SystemStats,
  VoiceMember,
} from "@motus/shared";
