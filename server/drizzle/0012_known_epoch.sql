PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_owner` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`muted_until` integer,
	`banned` integer DEFAULT 0 NOT NULL,
	`kicked_at` integer,
	`avatar_version` integer DEFAULT 0,
	`banner_version` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "display_name", "password_hash", "is_owner", "created_at", "muted_until", "banned", "kicked_at", "avatar_version", "banner_version") SELECT "id", "username", "display_name", "password_hash", "is_owner", "created_at", "muted_until", "banned", "kicked_at", "avatar_version", "banner_version" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);