ALTER TABLE `decks` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `share_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `decks_share_id_unique` ON `decks` (`share_id`);