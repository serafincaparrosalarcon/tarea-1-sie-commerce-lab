CREATE TABLE `order_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`recipient` text NOT NULL,
	`template` text NOT NULL,
	`delivery_status` text DEFAULT 'SIMULATED' NOT NULL,
	`provider_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_email` text;