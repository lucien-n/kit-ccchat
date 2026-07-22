CREATE TABLE `message_reactions` (
	`id` text NOT NULL,
	`emoji` text NOT NULL,
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `emoji`, `user_id`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
