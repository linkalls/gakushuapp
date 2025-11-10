CREATE TABLE `rankings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`score` integer NOT NULL,
	`rank` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shared_decks` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`shared_by` text NOT NULL,
	`shared_with` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shared_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shared_with`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
