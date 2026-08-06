import { z } from "zod";
import {
  channelType,
  hexColor,
  permission,
  systemEvent,
  theme,
  themeMode,
  themeRadius,
} from "./primitives.js";

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
  bannerVersion: z.number().nullable(),
  /** The member's own chosen profile color, distinct from the role-derived
   *  `color`. Roles still win for the name; this fills in when they have none,
   *  and tints the profile card's banner fallback. */
  accentColor: hexColor.nullable(),
  /** A short "about me" the member sets on their own profile. null = unset. */
  bio: z.string().nullable(),
});
export type Member = z.infer<typeof member>;

export const customTheme = z.object({
  primary: hexColor.nullable(),
  background: hexColor.nullable(),
  radius: themeRadius.nullable(),
});
export type CustomTheme = z.infer<typeof customTheme>;

/** A member's private appearance preferences, persisted server-side so they
 *  follow the account across devices rather than living only in localStorage. */
export const appearanceView = z.object({
  mode: themeMode,
  theme,
  reducedMotion: z.boolean(),
  customTheme,
});
export type AppearanceView = z.infer<typeof appearanceView>;

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
  sharing: z.boolean(),
  /** Publishing a webcam feed. Independent of `sharing`; a member can do both. */
  camera: z.boolean(),
  /** Not transmitting audio by the member's own doing - self-mute or a denied
   *  mic. Distinct from forceMuted so the two render differently. */
  muted: z.boolean(),
  /** Silenced by a moderator. Shown red for everyone and cannot be cleared by
   *  the member's own mic toggle. */
  forceMuted: z.boolean(),
  /** Has silenced all incoming audio. Independent of muted, though deafening
   *  also mutes, so a deafened member is muted too. */
  deafened: z.boolean(),
});
export type VoiceMember = z.infer<typeof voiceMember>;

export const channel = z.object({
  id: z.uuid(),
  name: z.string(),
  type: channelType,
  position: z.number(),
  /** The one text channel that receives member-join lines. Exactly one text
   *  channel is main at any time; voice channels are never main. */
  isMain: z.boolean(),
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

/** A file hung off a message. Images (`image: true`) carry their pixel
 *  dimensions and render inline; everything else is a download card. `expiresAt`
 *  is set only on large files the sweeper will eventually reclaim. */
export const messageAttachment = z.object({
  id: z.uuid(),
  filename: z.string(),
  sizeBytes: z.number(),
  mime: z.string(),
  image: z.boolean(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  expiresAt: z.number().nullable(),
});
export type MessageAttachment = z.infer<typeof messageAttachment>;

export const sound = z.object({
  id: z.uuid(),
  name: z.string(),
  emoji: z.string().nullable(),
  uploaderId: z.string(),
  durationMs: z.number(),
  createdAt: z.number(),
});
export type Sound = z.infer<typeof sound>;

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
  attachments: z.array(messageAttachment),
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
  AttachmentsDir = "AttachmentsDir",
  SoundsDir = "SoundsDir",
  DatabaseFile = "DatabaseFile",
  BackupsDir = "BackupsDir",
}

/** One database snapshot on disk. `createdAt` is the file's mtime, which never
 *  moves after the one-shot write. */
export const backupItem = z.object({
  name: z.string(),
  sizeBytes: z.number(),
  createdAt: z.number(),
});
export type BackupItem = z.infer<typeof backupItem>;

export const backupStatus = z.object({
  /** 0 = automatic backups disabled. */
  intervalHours: z.number(),
  /** 0 = keep all. */
  retention: z.number(),
  totalBytes: z.number(),
  lastBackupAt: z.number().nullable(),
  /** When the next automatic backup is due; null when disabled. */
  nextBackupAt: z.number().nullable(),
  items: z.array(backupItem),
});
export type BackupStatus = z.infer<typeof backupStatus>;

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
  backups: backupStatus,
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
