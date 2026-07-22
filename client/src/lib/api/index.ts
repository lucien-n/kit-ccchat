import { auth } from "./auth";
import { channels } from "./channels";
import { community } from "./community";
import { images } from "./images";
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
  images,
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
export { imageUrl } from "./images";
export { apiBase, ApiError } from "./http";
export { ModAction } from "./moderation";
export { authToken } from "./token.svelte";
export { avatarUrl } from "./users";

export type {
  Channel,
  Invite,
  Member,
  MessageImage,
  MessageView,
  ModeratedMember,
  Role,
  SearchHit,
  SystemStats,
  VoiceMember,
} from "@ccchat/shared";
