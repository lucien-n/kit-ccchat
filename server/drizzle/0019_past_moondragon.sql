CREATE TABLE `message_pins` (
	`message_id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`pinned_by` text NOT NULL,
	`pinned_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_pins_channel` ON `message_pins` (`channel_id`,`pinned_at`);