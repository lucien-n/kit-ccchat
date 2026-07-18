import { z } from "zod";
import {
  channelName,
  channelType,
  ChannelType,
  communityName,
  displayName,
  hexColor,
  inviteCode,
  maxUses,
  optionalDisplayName,
  password,
  permission,
  Permission,
  roleName,
  username,
} from "./primitives.js";

/** Request bodies. The server validates with these; the client's forms are
 *  built from the same objects, so a rule can't drift between the two. */

export const registerBody = z.object({
  inviteCode,
  username,
  displayName: optionalDisplayName,
  password,
});
export type RegisterBody = z.infer<typeof registerBody>;

export const loginBody = z.object({
  username: z.string().trim().toLowerCase(),
  password: z.string(),
});
export type LoginBody = z.infer<typeof loginBody>;

export const setupBody = z.object({
  communityName,
  username,
  displayName: optionalDisplayName,
  password,
});
export type SetupBody = z.infer<typeof setupBody>;

export const createInviteBody = z.object({
  /** Single-use unless asked otherwise: the safe default for a link you paste
   *  into a chat you don't control. */
  maxUses: maxUses.default(1),
  /** Hours from now. 0 or absent = never expires; negative is ignored rather
   *  than minting a link that is dead on arrival. */
  expiresInHours: z.number().optional(),
});
export type CreateInviteBody = z.infer<typeof createInviteBody>;

export const createChannelBody = z.object({
  name: channelName,
  type: channelType.default(ChannelType.Text),
});
export type CreateChannelBody = z.infer<typeof createChannelBody>;

export const renameCommunityBody = z.object({ communityName });
export type RenameCommunityBody = z.infer<typeof renameCommunityBody>;

export const updateProfileBody = z.object({ displayName });
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "current password required"),
  newPassword: password,
});
export type ChangePasswordBody = z.infer<typeof changePasswordBody>;

export const voiceTokenBody = z.object({ channelId: z.string().min(1) });
export type VoiceTokenBody = z.infer<typeof voiceTokenBody>;

export const muteBody = z.object({
  minutes: z.number().int().positive().max(10080).default(60),
});
export type MuteBody = z.infer<typeof muteBody>;

export const avatarBody = z.object({ image: z.string().min(1) });
export type AvatarBody = z.infer<typeof avatarBody>;

export const createRoleBody = z.object({
  name: roleName,
  color: hexColor.nullable().default(null),
  permission: permission.default(Permission.Member),
});
export type CreateRoleBody = z.infer<typeof createRoleBody>;

export const updateRoleBody = z.object({
  name: roleName.optional(),
  color: hexColor.nullable().optional(),
  permission: permission.optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateRoleBody = z.infer<typeof updateRoleBody>;

export const setUserRolesBody = z.object({
  roleIds: z.array(z.string()),
});
export type SetUserRolesBody = z.infer<typeof setUserRolesBody>;
