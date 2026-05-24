import {
  bigint,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Platform Connections ─────────────────────────────────────────────────────

export const platformConnections = mysqlTable("platform_connections", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]).notNull(),
  accountName: varchar("accountName", { length: 255 }),
  accountId: varchar("accountId", { length: 255 }),
  apiKey: text("apiKey"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  pageId: varchar("pageId", { length: 255 }),
  status: mysqlEnum("status", ["connected", "disconnected", "error"]).default("disconnected").notNull(),
  lastCheckedAt: timestamp("lastCheckedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = typeof platformConnections.$inferInsert;

// ─── Content Posts ────────────────────────────────────────────────────────────

export const contentPosts = mysqlTable("content_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }),
  caption: text("caption"),
  hashtags: text("hashtags"),
  platform: mysqlEnum("platform", ["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]).notNull(),
  contentType: mysqlEnum("contentType", ["text", "image", "video", "reel", "story", "carousel"]).default("text").notNull(),
  contentPillar: mysqlEnum("contentPillar", ["strong_opinion", "practical_education", "documentary", "direct_promotion"]).default("strong_opinion"),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "scheduled", "published", "rejected", "failed"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  mediaUrl: text("mediaUrl"),
  mediaStorageKey: text("mediaStorageKey"),
  scriptText: text("scriptText"),
  heygenVideoId: varchar("heygenVideoId", { length: 255 }),
  heygenStatus: mysqlEnum("heygenStatus", ["pending", "processing", "completed", "failed"]),
  heygenVideoUrl: text("heygenVideoUrl"),
  aiGenerated: boolean("aiGenerated").default(false).notNull(),
  generationPrompt: text("generationPrompt"),
  imageUrl: text("imageUrl"),
  imagePrompt: text("imagePrompt"),
  rejectionReason: text("rejectionReason"),
  externalPostId: varchar("externalPostId", { length: 255 }),
  publishError: text("publishError"),
  scheduleId: int("scheduleId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentPost = typeof contentPosts.$inferSelect;
export type InsertContentPost = typeof contentPosts.$inferInsert;

// ─── Content Schedules ────────────────────────────────────────────────────────

export const contentSchedules = mysqlTable("content_schedules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cron: varchar("cron", { length: 100 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  cronTaskUid: varchar("cronTaskUid", { length: 65 }),
  platforms: text("platforms").notNull(), // JSON array of platforms
  postsPerRun: int("postsPerRun").default(1).notNull(),
  contentPillars: text("contentPillars"), // JSON array of pillars
  generationPrompt: text("generationPrompt"),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentSchedule = typeof contentSchedules.$inferSelect;
export type InsertContentSchedule = typeof contentSchedules.$inferInsert;

// ─── Media Assets ─────────────────────────────────────────────────────────────

export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  type: mysqlEnum("type", ["image", "video", "audio", "document"]).notNull(),
  url: text("url").notNull(),
  storageKey: text("storageKey").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  sizeBytes: bigint("sizeBytes", { mode: "number" }),
  linkedPostId: int("linkedPostId"),
  tags: text("tags"), // JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;

// ─── Analytics Events ─────────────────────────────────────────────────────────

export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]).notNull(),
  eventType: mysqlEnum("eventType", ["published", "failed", "rejected", "approved", "scheduled"]).notNull(),
  metadata: text("metadata"), // JSON
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// ─── HeyGen Video Requests ────────────────────────────────────────────────────

export const heygenRequests = mysqlTable("heygen_requests", {
  id: int("id").autoincrement().primaryKey(),
  videoId: varchar("videoId", { length: 255 }),
  title: varchar("title", { length: 500 }).notNull(),
  scriptText: text("scriptText").notNull(),
  avatarId: varchar("avatarId", { length: 255 }),
  voiceId: varchar("voiceId", { length: 255 }),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  videoUrl: text("videoUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  durationSeconds: int("durationSeconds"),
  errorMessage: text("errorMessage"),
  linkedPostId: int("linkedPostId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HeygenRequest = typeof heygenRequests.$inferSelect;
export type InsertHeygenRequest = typeof heygenRequests.$inferInsert;
