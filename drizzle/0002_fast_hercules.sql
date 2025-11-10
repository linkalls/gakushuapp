CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`reference_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`status` text NOT NULL,
	`period_start` integer,
	`period_end` integer,
	`cancel_at_period_end` integer,
	`seats` integer,
	`trial_start` integer,
	`trial_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `plan`;