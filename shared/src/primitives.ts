import { z } from "zod";

export const ROLES = ["owner", "admin", "member"] as const;
export const role = z.enum(ROLES);
export type Role = z.infer<typeof role>;

export const channelType = z.enum(["text", "voice"]);
export type ChannelType = z.infer<typeof channelType>;

/** Usernames are the login identity and appear in URLs and mentions, so the
 *  charset is deliberately narrow. Lowercased on the way in - `Lucien` and
 *  `lucien` must not be two accounts. */
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.-]{2,24}$/, "username must be 2-24 chars: a-z 0-9 _ . -");

/** Only a floor. Length is the one rule worth enforcing: composition rules push
 *  people toward `Passw0rd!` and away from the long passphrases we want. */
export const password = z
  .string()
  .min(8, "password must be at least 8 characters");

export const displayName = z.string().trim().min(1).max(32);

/** Blank means "use my username", so an empty string is valid here rather than
 *  a too-short name. A form binds an untouched optional field to '', and the
 *  server reads `displayName || username`. */
export const optionalDisplayName = z
  .union([z.literal(""), displayName])
  .optional();

/** Word chars, dashes and spaces. Narrow because channel names show up in
 *  `#mentions` and the composer placeholder. */
export const channelName = z
  .string()
  .trim()
  .regex(/^[\w\- ]{1,32}$/, "invalid channel name");
export const communityName = z.string().trim().min(1).max(60);
export const inviteCode = z.string().trim().min(1, "invite code required");

/** 0 means unlimited - the invite list and the redemption check both rely on it. */
export const maxUses = z.number().int().min(0).max(1000);
