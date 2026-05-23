CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`platform` enum('instagram','linkedin','facebook','youtube') NOT NULL,
	`eventType` enum('published','failed','rejected','approved','scheduled') NOT NULL,
	`metadata` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500),
	`caption` text,
	`hashtags` text,
	`platform` enum('instagram','linkedin','facebook','youtube') NOT NULL,
	`contentType` enum('text','image','video','reel','story','carousel') NOT NULL DEFAULT 'text',
	`contentPillar` enum('strong_opinion','practical_education','documentary','direct_promotion') DEFAULT 'strong_opinion',
	`status` enum('draft','pending_approval','approved','scheduled','published','rejected','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`mediaUrl` text,
	`mediaStorageKey` text,
	`scriptText` text,
	`heygenVideoId` varchar(255),
	`heygenStatus` enum('pending','processing','completed','failed'),
	`heygenVideoUrl` text,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`generationPrompt` text,
	`rejectionReason` text,
	`externalPostId` varchar(255),
	`scheduleId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cron` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`cronTaskUid` varchar(65),
	`platforms` text NOT NULL,
	`postsPerRun` int NOT NULL DEFAULT 1,
	`contentPillars` text,
	`generationPrompt` text,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `heygen_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` varchar(255),
	`title` varchar(500) NOT NULL,
	`scriptText` text NOT NULL,
	`avatarId` varchar(255),
	`voiceId` varchar(255),
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`videoUrl` text,
	`thumbnailUrl` text,
	`durationSeconds` int,
	`errorMessage` text,
	`linkedPostId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `heygen_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(500) NOT NULL,
	`type` enum('image','video','audio','document') NOT NULL,
	`url` text NOT NULL,
	`storageKey` text NOT NULL,
	`mimeType` varchar(100),
	`sizeBytes` bigint,
	`linkedPostId` int,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('instagram','linkedin','facebook','youtube') NOT NULL,
	`accountName` varchar(255),
	`accountId` varchar(255),
	`apiKey` text,
	`accessToken` text,
	`refreshToken` text,
	`pageId` varchar(255),
	`status` enum('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`lastCheckedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_connections_id` PRIMARY KEY(`id`)
);
