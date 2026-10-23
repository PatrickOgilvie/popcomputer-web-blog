CREATE TABLE `blogs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "blogs_slug_format" CHECK(length("blogs"."slug") BETWEEN 3 AND 40 AND "blogs"."slug" NOT GLOB '*[^a-z0-9-]*'),
	CONSTRAINT "blogs_title_length" CHECK(length("blogs"."title") BETWEEN 1 AND 80),
	CONSTRAINT "blogs_description_length" CHECK("blogs"."description" IS NULL OR length("blogs"."description") <= 200)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blogs_user_id_unique` ON `blogs` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `blogs_slug_unique` ON `blogs` (`slug`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`blog_id` text NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`body` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "posts_slug_format" CHECK(length("posts"."slug") BETWEEN 1 AND 80 AND "posts"."slug" NOT GLOB '*[^a-z0-9-]*'),
	CONSTRAINT "posts_title_length" CHECK(length("posts"."title") BETWEEN 1 AND 120),
	CONSTRAINT "posts_excerpt_length" CHECK("posts"."excerpt" IS NULL OR length("posts"."excerpt") <= 300),
	CONSTRAINT "posts_body_length" CHECK(length("posts"."body") <= 50000),
	CONSTRAINT "posts_status" CHECK("posts"."status" IN ('draft', 'published')),
	CONSTRAINT "posts_published_at" CHECK("posts"."status" = 'draft' OR "posts"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_blog_slug_unique` ON `posts` (`blog_id`,`slug`);--> statement-breakpoint
CREATE INDEX `posts_blog_published_idx` ON `posts` (`blog_id`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `posts_user_updated_idx` ON `posts` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rate_limit` (`key`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_anonymous` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);