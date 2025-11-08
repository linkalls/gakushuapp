ALTER TABLE `decks` ADD `parent_id` text REFERENCES decks(id);--> statement-breakpoint
ALTER TABLE `decks` ADD `deck_path` text NOT NULL;