import { auth } from "./auth";
import { channels } from "./channels";
import { community } from "./community";
import { invites } from "./invites";
import { messages } from "./messages";
import { moderation } from "./moderation";
import { roles } from "./roles";
import { search } from "./search";
import { system } from "./system";
import { users } from "./users";
import { voice } from "./voice";

export const api = {
  auth,
  channels,
  community,
  invites,
  messages,
  moderation,
  roles,
  search,
  system,
  users,
  voice,
};

export { communityIconUrl } from "./community";
export { apiBase, ApiError } from "./http";
export { ModAction } from "./moderation";
export { authToken } from "./token.svelte";
export { avatarUrl } from "./users";

export type {
  Channel,
  Invite,
  Member,
  MessageView,
  ModeratedMember,
  Role,
  SearchHit,
  SystemStats,
  VoiceMember,
} from "@ccchat/shared";
