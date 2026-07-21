CREATE TABLE `message_mentions` (
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`message_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_message_mentions_user` ON `message_mentions` (`user_id`);--> statement-breakpoint
ALTER TABLE `messages` ADD `mentions_everyone` integer DEFAULT 0 NOT NULL;