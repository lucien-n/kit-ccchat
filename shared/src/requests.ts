import { z } from "zod";
import { reactionEmoji } from "./emoji.js";
import {
  channelName,
  channelType,
  ChannelType,
  communityName,
  dataUrl,
  displayName,
  hexColor,
  imageDataUrl,
  inviteCode,
  maxUses,
  MESSAGE_MAX_LENGTH,
  MAX_SOUNDBOARD_DURATION_MS,
  optionalDisplayName,
  password,
  MAX_SOUNDBOARD_NAME,
  permission,
  Permission,
  roleName,
  SEARCH_PAGE,
  searchSort,
  SearchSort,
  theme,
  themeMode,
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

export const renameChannelBody = z.object({ name: channelName });
export type RenameChannelBody = z.infer<typeof renameChannelBody>;

export const renameCommunityBody = z.object({ communityName });

/** A partial profile patch: each field is optional so the display-name form and
 *  the accent-color picker can each save on their own without clobbering the
 *  other. `accentColor: null` clears it. */
export const updateProfileBody = z.object({
  displayName: displayName.optional(),
  accentColor: hexColor.nullable().optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const updateAppearanceBody = z.object({
  mode: themeMode,
  theme,
  reducedMotion: z.boolean(),
});
export type UpdateAppearanceBody = z.infer<typeof updateAppearanceBody>;

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "current password required"),
  newPassword: password,
});
export type ChangePasswordBody = z.infer<typeof changePasswordBody>;

export const voiceTokenBody = z.object({ channelId: z.string().min(1) });

export const muteBody = z.object({
  minutes: z.number().int().positive().max(10080).default(60),
});

export const uploadImageBody = z.object({
  image: imageDataUrl,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type UploadImageBody = z.infer<typeof uploadImageBody>;

export const avatarBody = z.object({ image: imageDataUrl });
export type AvatarBody = z.infer<typeof avatarBody>;

export const bannerBody = z.object({ image: imageDataUrl });
export type BannerBody = z.infer<typeof bannerBody>;

export const uploadSoundBody = z.object({
  sound: dataUrl,
  name: z.string().trim().min(1).max(MAX_SOUNDBOARD_NAME),
  emoji: z.string().trim().max(8).optional(),
  durationMs: z.number().int().positive().max(MAX_SOUNDBOARD_DURATION_MS),
});
export type UploadSoundBody = z.infer<typeof uploadSoundBody>;

export const updateSoundBody = uploadSoundBody.pick({ emoji: true, name: true });
export type UpdateSoundBody = z.infer<typeof updateSoundBody>;

export const communityIconBody = z.object({ image: imageDataUrl });
export type CommunityIconBody = z.infer<typeof communityIconBody>;

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

/** Roles top-to-bottom as shown to the user (highest precedence first). The
 *  server reassigns positions from this, so the order is the whole truth and
 *  positions never collide. */
export const reorderRolesBody = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const editMessageBody = z.object({
  content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});
export type EditMessageBody = z.infer<typeof editMessageBody>;

/** Query strings, parsed best-effort: a junk value falls back to the default
 *  rather than failing the request. */

const queryValue = z.union([z.string(), z.number()]).optional();

const positive = (v: string | number | undefined): number | undefined => {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
};

export const messageHistoryQuery = z
  .object({ before: queryValue, after: queryValue, limit: queryValue })
  .transform((q) => ({
    before: positive(q.before),
    after: positive(q.after),
    limit: Math.min(positive(q.limit) ?? 50, 100),
  }));
export type MessageHistoryQuery = z.infer<typeof messageHistoryQuery>;

export const messageAroundQuery = z
  .object({ limit: queryValue })
  .transform((q) => ({ limit: Math.min(positive(q.limit) ?? 25, 100) }));

export const searchQuery = z
  .object({
    q: z.string().optional(),
    channelId: z.string().optional(),
    authorId: z.string().optional(),
    sort: searchSort.optional(),
    limit: queryValue,
    offset: queryValue,
  })
  .transform((s) => ({
    q: s.q ?? "",
    channelId: s.channelId || undefined,
    authorId: s.authorId || undefined,
    sort: s.sort ?? SearchSort.Newest,
    limit: Math.min(positive(s.limit) ?? SEARCH_PAGE, 50),
    offset: Math.max(Math.trunc(Number(s.offset)) || 0, 0),
  }));
export type SearchQuery = z.infer<typeof searchQuery>;

export const reactMessageParam = z.object({
  id: z.uuid(),
  emoji: reactionEmoji,
});
