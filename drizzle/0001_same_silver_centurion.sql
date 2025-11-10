CREATE TABLE `ai_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`deck_id` text,
	`type` text NOT NULL,
	`input_content` text,
	`input_file_name` text,
	`cards_generated` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
