import { z } from "zod";
import { channelType, hexColor, permission, systemEvent } from "./primitives.js";

/** A member's identity as everyone else sees them: the lean shape embedded
 *  wherever a person is referenced (message author, reply, role list). Never
 *  carries passwordHash - that omission is why this exists over the db row. */
export const memberRef = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  color: z.string().nullable(),
  avatarVersion: z.number().nullable(),
});
export type MemberRef = z.infer<typeof memberRef>;

/** A member of the community: identity plus rank. This is the roster row. */
export const member = memberRef.extend({
  isOwner: z.boolean(),
  isAdmin: z.boolean(),
});
export type Member = z.infer<typeof member>;

export const role = z.object({
  id: z.uuid(),
  name: z.string(),
  color: hexColor.nullable(),
  permission,
  position: z.number(),
});
export type Role = z.infer<typeof role>;

export const voiceMember = z.object({
  id: z.uuid(),
  displayName: z.string(),
  avatarVersion: z.number().nullable(),
});
export type VoiceMember = z.infer<typeof voiceMember>;

export const channel = z.object({
  id: z.uuid(),
  name: z.string(),
  type: channelType,
  position: z.number(),
});
export type Channel = z.infer<typeof channel>;

/** The quoted message shown above a reply. Resolved on every read rather than
 *  snapshotted at send time, so an edit or a delete is reflected in the quote.
 *  A deleted original keeps its id but surrenders its content and author. */
export const replyRef = z.object({
  id: z.uuid(),
  content: z.string(),
  author: memberRef.nullable(),
  deleted: z.boolean(),
});
export type ReplyRef = z.infer<typeof replyRef>;

export const messageImage = z.object({
  id: z.uuid(),
  width: z.number(),
  height: z.number(),
});
export type MessageImage = z.infer<typeof messageImage>;

export const reaction = z.object({
  emoji: z.string(),
  userIds: z.array(z.string()),
});
export type Reaction = z.infer<typeof reaction>;

export const messageView = z.object({
  id: z.uuid(),
  channelId: z.uuid(),
  content: z.string(),
  createdAt: z.number(),
  editedAt: z.number().nullable(),
  author: memberRef.nullable(),
  replyTo: replyRef.nullable(),
  /** null for an ordinary message; the event kind for a system line, whose
   *  `author` is the subject (e.g. the member who joined). */
  systemEvent: systemEvent.nullable(),
  mentions: z.array(z.string()),
  mentionsEveryone: z.boolean(),
  reactions: z.array(reaction),
  images: z.array(messageImage),
});
export type MessageView = z.infer<typeof messageView>;

export enum InviteStatus {
  Active = "active",
  Revoked = "revoked",
  Expired = "expired",
  Used_Up = "used up",
}
export const inviteStatus = z.enum(InviteStatus);

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

/** A member seen through the moderation lens (admin-only): identity, rank, and
 *  the enforcement state everyone else never gets to see. */
export const moderatedMember = member.extend({
  banned: z.number(),
  mutedUntil: z.number().nullable(),
  roleIds: z.array(z.string()),
});
export type ModeratedMember = z.infer<typeof moderatedMember>;

export enum DiskItem {
  AvatarDir = "AvatarDir",
  ImagesDir = "ImagesDir",
  DatabaseFile = "DatabaseFile",
}

const diskStats = z.object({
  totalBytes: z.number(),
  freeBytes: z.number(),
  usedBytes: z.number(),
  usedByItem: z.record(z.enum(DiskItem), z.number()),
});

/** Host machine snapshot, owner-only. Whole-box figures; disk is the filesystem
 *  the data dir lives on. */
export const systemStats = z.object({
  hostname: z.string(),
  platform: z.string(),
  arch: z.string(),
  uptimeSec: z.number(),
  cpu: z.object({
    model: z.string(),
    cores: z.number(),
    loadAvg: z.tuple([z.number(), z.number(), z.number()]),
    usagePct: z.number(),
  }),
  memory: z.object({
    totalBytes: z.number(),
    usedBytes: z.number(),
    freeBytes: z.number(),
  }),
  disk: diskStats,
  app: z.object({
    uptimeSec: z.number(),
    rssBytes: z.number(),
  }),
  history: z.array(z.object({ t: z.number(), cpuPct: z.number(), memPct: z.number() })),
  sampleIntervalSec: z.number(),
});
export type SystemStats = z.infer<typeof systemStats>;

/** One search result: the message as the chat would render it, plus the excerpt
 *  the index matched on, with MATCH_OPEN/MATCH_CLOSE bracketing each hit. */
export const searchHit = z.object({
  message: messageView,
  snippet: z.string(),
});
export type SearchHit = z.infer<typeof searchHit>;

export const searchResults = z.object({
  hits: z.array(searchHit),
  total: z.number(),
  hasMore: z.boolean(),
});
export type SearchResults = z.infer<typeof searchResults>;

/** A window of history centred on one message, for opening a search result in
 *  place. Unlike plain history it can be detached from the newest message, so it
 *  reports what remains in both directions. */
export const messageWindow = z.object({
  messages: z.array(messageView),
  hasMoreBefore: z.boolean(),
  hasMoreAfter: z.boolean(),
});
export type MessageWindow = z.infer<typeof messageWindow>;
