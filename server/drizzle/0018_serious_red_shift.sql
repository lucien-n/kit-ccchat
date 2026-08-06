CREATE TABLE `message_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text,
	`uploader_id` text NOT NULL,
	`filename` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`mime` text NOT NULL,
	`image` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_attachments_message` ON `message_attachments` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_message_attachments_expiry` ON `message_attachments` (`expires_at`);--> statement-breakpoint
DROP TABLE `message_images`;