import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

/** A member of this community. Accounts are per-instance: there is no email and
 *  no external identity provider. You join by redeeming an invite code. */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  // 'owner' | 'admin' | 'member' — drives moderation permissions.
  role: text('role').notNull().default('member'),
  createdAt: integer('created_at').notNull(),
  // Epoch ms until which the user is muted (cannot send). null/absent = not muted.
  mutedUntil: integer('muted_until'),
  // 1 = banned (cannot log in or connect).
  banned: integer('banned').notNull().default(0),
  // Epoch ms of the last avatar upload; null = no avatar. Doubles as a
  // cache-busting version for the avatar URL.
  avatarVersion: integer('avatar_version'),
});

/** Invite codes. The owner/admins mint these and share them out of band. */
export const invites = sqliteTable('invites', {
  code: text('code').primaryKey(),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  // How many times this code may be redeemed. 0 = unlimited.
  maxUses: integer('max_uses').notNull().default(1),
  uses: integer('uses').notNull().default(0),
  // Epoch ms; null = never expires.
  expiresAt: integer('expires_at'),
  revoked: integer('revoked').notNull().default(0),
});

/** A room. Text channels carry messages; voice channels are placeholders for the
 *  phase-2 WebRTC work — they show up in the list but aren't functional yet. */
export const channels = sqliteTable('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('text'), // 'text' | 'voice'
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull(),
  authorId: text('author_id').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
  editedAt: integer('edited_at'),
  // Soft delete so moderation actions are auditable rather than destructive.
  deleted: integer('deleted').notNull().default(0),
});

/** Opaque bearer tokens. Works identically for the web client and the future
 *  Capacitor mobile app (no cookie assumptions). */
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

/** Per-user, per-channel read marker. Unread counts are derived from this:
 *  messages in a channel newer than lastReadAt (and not your own) are unread.
 *  Persisting it means badges survive reloads and follow you across devices. */
export const channelReads = sqliteTable(
  'channel_reads',
  {
    userId: text('user_id').notNull(),
    channelId: text('channel_id').notNull(),
    lastReadAt: integer('last_read_at').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.channelId] }) }),
);

/** Instance configuration that the owner can change at runtime (community name,
 *  and anything we add later). Living in the DB rather than the environment is
 *  what lets a self-hoster set it from the setup wizard instead of editing a
 *  file and restarting the container. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type User = typeof users.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Message = typeof messages.$inferSelect;
