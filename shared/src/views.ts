import { z } from "zod";
import { channelType } from "./primitives.js";

/** A user as everyone else sees them. Never carries passwordHash - that
 *  omission is the reason this shape exists rather than leaking the db row. */
export const publicUser = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: z.string(),
  avatarVersion: z.number().nullable(),
});
export type PublicUser = z.infer<typeof publicUser>;

export const voiceMember = z.object({
  id: z.string(),
  name: z.string(),
  avatarVersion: z.number().nullable(),
});
export type VoiceMember = z.infer<typeof voiceMember>;

export const channel = z.object({
  id: z.string(),
  name: z.string(),
  type: channelType,
  position: z.number(),
});
export type Channel = z.infer<typeof channel>;

export const messageAuthor = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarVersion: z.number().nullable(),
});

export const messageView = z.object({
  id: z.string(),
  channelId: z.string(),
  content: z.string(),
  createdAt: z.number(),
  editedAt: z.number().nullable(),
  author: messageAuthor.nullable(),
});
export type MessageView = z.infer<typeof messageView>;

export const inviteStatus = z.enum(["active", "revoked", "expired", "used up"]);
export type InviteStatus = z.infer<typeof inviteStatus>;

export const invite = z.object({
  code: z.string(),
  createdAt: z.number(),
  createdBy: z.string(),
  /** 0 = unlimited. */
  maxUses: z.number(),
  uses: z.number(),
  expiresAt: z.number().nullable(),
  revoked: z.boolean(),
  /** Server-computed: still redeemable? Don't re-derive this on the client. */
  active: z.boolean(),
  status: inviteStatus,
});
export type Invite = z.infer<typeof invite>;

export const memberView = publicUser.extend({
  banned: z.number(),
  mutedUntil: z.number().nullable(),
});
export type MemberView = z.infer<typeof memberView>;
