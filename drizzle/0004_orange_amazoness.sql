ALTER TABLE `users` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_status` text;--> statement-breakpoint
ALTER TABLE `users` ADD `plan_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_end_date` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_stripe_customer_id_unique` ON `users` (`stripe_customer_id`);