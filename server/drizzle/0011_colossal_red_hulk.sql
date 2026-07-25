CREATE TABLE `soundboard_sounds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`emoji` text,
	`uploader_id` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_soundboard_created` ON `soundboard_sounds` (`created_at`);