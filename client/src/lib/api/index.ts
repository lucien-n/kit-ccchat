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

export { ApiError, apiBase } from "./http";
export { communityIconUrl } from "./community";
export { avatarUrl } from "./users";
export { authToken } from "./token.svelte";
export type { ModAction } from "./moderation";

export type {
  Channel,
  Invite,
  Member,
  MessageView,
  MessageWindow,
  ModeratedMember,
  Role,
  SearchHit,
  SearchResults,
  SystemStats,
  VoiceMember,
} from "@ccchat/shared";
