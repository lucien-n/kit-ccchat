CREATE TABLE `message_images` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text,
	`uploader_id` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_images_message` ON `message_images` (`message_id`);