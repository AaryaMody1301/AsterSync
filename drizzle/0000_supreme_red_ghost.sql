CREATE TABLE `enquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`service` text NOT NULL,
	`budget` text NOT NULL,
	`timeline` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `enquiries_email_created_idx` ON `enquiries` (`email`,`created_at`);