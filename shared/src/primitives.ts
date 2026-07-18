import { z } from "zod";

/** The authorization a Role grants. 'member' is the baseline (grants nothing
 *  beyond being a member), so a member-permission role is purely cosmetic.
 *  'owner' is intrinsic (users.isOwner), never a permission a role can hold. */
export enum Permission {
  Admin = "admin",
  Member = "member",
}
export const permission = z.enum(Permission);

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "color must be a hex like #a1b2c3");

export const roleName = z.string().trim().min(1).max(32);

export enum ChannelType {
  Text = "text",
  Voice = "voice",
}
export const channelType = z.enum(ChannelType);

export enum SystemEvent {
  Member_Join = "member_join",
}
export const systemEvent = z.enum(SystemEvent);

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.-]{2,24}$/, "username must be 2-24 chars: a-z 0-9 _ . -");

export const password = z.string().min(8, "password must be at least 8 characters");

export const displayName = z.string().trim().min(1).max(32);

export const optionalDisplayName = z.union([z.literal(""), displayName]).optional();

export const channelName = z
  .string()
  .trim()
  .regex(/^[\w\- ]{1,32}$/, "invalid channel name");
export const communityName = z.string().trim().min(1).max(60);
export const inviteCode = z.string().trim().min(1, "invite code required");

export const maxUses = z.number().int().min(0).max(1000);

export const MESSAGE_MAX_LENGTH = 4000;

export const REPLY_SNIPPET_MAX = 200;
