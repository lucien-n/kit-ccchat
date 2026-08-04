ALTER TABLE `channels` ADD `is_main` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `channels` SET `is_main` = 1 WHERE `id` = (
  SELECT `id` FROM `channels` WHERE `type` = 'text'
  ORDER BY `position`, `created_at` LIMIT 1
);