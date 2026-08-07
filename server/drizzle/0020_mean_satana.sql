CREATE TABLE `message_embeds` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`description` text,
	`site_name` text,
	`image_url` text,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_embeds_message` ON `message_embeds` (`message_id`);