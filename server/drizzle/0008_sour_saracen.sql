PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_channel_reads` (
	`user_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`last_read_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `channel_id`),
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_channel_reads`("user_id", "channel_id", "last_read_at") SELECT "user_id", "channel_id", "last_read_at" FROM `channel_reads`;--> statement-breakpoint
DROP TABLE `channel_reads`;--> statement-breakpoint
ALTER TABLE `__new_channel_reads` RENAME TO `channel_reads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_message_mentions` (
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`message_id`, `user_id`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_message_mentions`("message_id", "user_id") SELECT "message_id", "user_id" FROM `message_mentions`;--> statement-breakpoint
DROP TABLE `message_mentions`;--> statement-breakpoint
ALTER TABLE `__new_message_mentions` RENAME TO `message_mentions`;--> statement-breakpoint
CREATE INDEX `idx_message_mentions_user` ON `message_mentions` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	`deleted` integer DEFAULT 0 NOT NULL,
	`reply_to_id` text,
	`system_event` text,
	`mentions_everyone` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "channel_id", "author_id", "content", "created_at", "edited_at", "deleted", "reply_to_id", "system_event", "mentions_everyone") SELECT "id", "channel_id", "author_id", "content", "created_at", "edited_at", "deleted", "reply_to_id", "system_event", "mentions_everyone" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
CREATE INDEX `idx_messages_channel` ON `messages` (`channel_id`,`created_at`);