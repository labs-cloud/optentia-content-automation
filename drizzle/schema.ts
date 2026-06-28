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
  passwordHash: text("passwordHash"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Shared platform list — append-only (MySQL enum values must never be reordered/removed).
export const PLATFORM_VALUES = [
  "instagram",
  "linkedin",
  "linkedin_personal",
  "linkedin_company",
  "facebook",
  "youtube",
  "email",
  "whatsapp",
] as const;

// ─── Clients (workspaces) ─────────────────────────────────────────────────────

export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: text("websiteUrl"),
  industry: varchar("industry", { length: 255 }),
  description: text("description"),
  primaryOffer: text("primaryOffer"),
  audience: text("audience"),
  status: mysqlEnum("status", ["active", "paused", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Client Brand Profiles (one per client — the "Brand Brain") ───────────────

export const clientBrandProfiles = mysqlTable("client_brand_profiles", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  voice: text("voice"),
  tone: text("tone"),
  audience: text("audience"),
  buyerPains: text("buyerPains"),
  offers: text("offers"),
  proofPoints: text("proofPoints"),
  competitors: text("competitors"),
  visualStyle: text("visualStyle"),
  ctaStyle: text("ctaStyle"),
  forbiddenPhrases: text("forbiddenPhrases"),
  approvedExamples: json("approvedExamples"),
  rejectedExamples: json("rejectedExamples"),
  brandSummary: text("brandSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientBrandProfile = typeof clientBrandProfiles.$inferSelect;
export type InsertClientBrandProfile = typeof clientBrandProfiles.$inferInsert;

// ─── Preference Signals (swipes, approvals, rejections — the learning loop) ───

export const preferenceSignals = mysqlTable("preference_signals", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  userId: int("userId"),
  signalType: mysqlEnum("signalType", ["idea_swipe", "post_approval", "post_rejection", "edit", "winner", "saved", "used_in_campaign"]).notNull(),
  targetType: varchar("targetType", { length: 50 }),
  targetId: int("targetId"),
  direction: mysqlEnum("direction", ["positive", "negative"]).notNull(),
  content: text("content"),
  reason: text("reason"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PreferenceSignal = typeof preferenceSignals.$inferSelect;
export type InsertPreferenceSignal = typeof preferenceSignals.$inferInsert;

// ─── Brainstorm Ideas (swipe deck cards) ──────────────────────────────────────

export const brainstormIdeas = mysqlTable("brainstorm_ideas", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  campaignId: int("campaignId"),
  type: mysqlEnum("type", ["post_hook", "campaign_angle", "reel_idea", "carousel_idea", "email_angle", "whatsapp_message", "ad_concept", "visual_concept", "offer_angle"]).default("post_hook").notNull(),
  title: varchar("title", { length: 500 }),
  hook: varchar("hook", { length: 500 }),
  description: text("description"),
  platform: varchar("platform", { length: 50 }),
  contentPillar: varchar("contentPillar", { length: 50 }),
  visualConcept: text("visualConcept"),
  cta: text("cta"),
  status: mysqlEnum("status", ["proposed", "liked", "discarded", "saved", "promoted"]).default("proposed").notNull(),
  score: int("score"),
  source: varchar("source", { length: 50 }).default("ai"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrainstormIdea = typeof brainstormIdeas.$inferSelect;
export type InsertBrainstormIdea = typeof brainstormIdeas.$inferInsert;

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  goal: mysqlEnum("goal", ["awareness", "leads", "authority", "offer_push", "re_engagement", "education", "testimonial_proof"]).default("awareness").notNull(),
  thesis: text("thesis"),
  offer: text("offer"),
  brief: text("brief"),
  platforms: json("platforms"),
  durationDays: int("durationDays").default(14).notNull(),
  status: mysqlEnum("status", ["draft", "generating", "active", "completed", "archived"]).default("draft").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Campaign Content Items (planned content slots within a campaign) ─────────

export const campaignContentItems = mysqlTable("campaign_content_items", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  clientId: int("clientId").notNull(),
  contentPostId: int("contentPostId"),
  brainstormIdeaId: int("brainstormIdeaId"),
  role: varchar("role", { length: 100 }),
  platform: varchar("platform", { length: 50 }),
  conceptTitle: varchar("conceptTitle", { length: 500 }),
  conceptDescription: text("conceptDescription"),
  contentPillar: varchar("contentPillar", { length: 50 }),
  plannedDate: timestamp("plannedDate"),
  status: mysqlEnum("status", ["planned", "generated", "approved", "published"]).default("planned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignContentItem = typeof campaignContentItems.$inferSelect;
export type InsertCampaignContentItem = typeof campaignContentItems.$inferInsert;

// ─── Content Performance Snapshots ────────────────────────────────────────────

export const contentPerformanceSnapshots = mysqlTable("content_performance_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  contentPostId: int("contentPostId").notNull(),
  clientId: int("clientId").notNull(),
  platform: varchar("platform", { length: 50 }),
  impressions: int("impressions").default(0),
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  shares: int("shares").default(0),
  saves: int("saves").default(0),
  clicks: int("clicks").default(0),
  leads: int("leads").default(0),
  engagementRateBps: int("engagementRateBps"),
  raw: json("raw"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
});

export type ContentPerformanceSnapshot = typeof contentPerformanceSnapshots.$inferSelect;
export type InsertContentPerformanceSnapshot = typeof contentPerformanceSnapshots.$inferInsert;

// ─── Model Runs (LLM cost / latency / quality tracking) ───────────────────────

export const modelRuns = mysqlTable("model_runs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId"),
  userId: int("userId"),
  taskType: varchar("taskType", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 50 }).default("anthropic"),
  model: varchar("model", { length: 100 }),
  inputTokens: int("inputTokens"),
  outputTokens: int("outputTokens"),
  estimatedCostMicros: int("estimatedCostMicros"),
  latencyMs: int("latencyMs"),
  status: mysqlEnum("status", ["success", "error"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  qualityRating: int("qualityRating"),
  requestSummary: text("requestSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModelRun = typeof modelRuns.$inferSelect;
export type InsertModelRun = typeof modelRuns.$inferInsert;

// ─── Platform Connections ─────────────────────────────────────────────────────

export const platformConnections = mysqlTable("platform_connections", {
  id: int("id").autoincrement().primaryKey(),
  // Nullable for legacy rows; backfilled to the default client by scripts/seed.ts.
  clientId: int("clientId"),
  platform: mysqlEnum("platform", PLATFORM_VALUES).notNull(),
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
  // Nullable for legacy rows; backfilled to the default client by scripts/seed.ts.
  clientId: int("clientId"),
  campaignId: int("campaignId"),
  title: varchar("title", { length: 500 }),
  caption: text("caption"),
  hashtags: text("hashtags"),
  platform: mysqlEnum("platform", PLATFORM_VALUES).notNull(),
  contentType: mysqlEnum("contentType", ["text", "image", "video", "reel", "story", "carousel"]).default("text").notNull(),
  contentPillar: mysqlEnum("contentPillar", ["strong_opinion", "practical_education", "documentary", "direct_promotion"]).default("strong_opinion"),
  // `needs_generation` + `generating` added for the Phase 1 render worker (append-only — MySQL enum
  // values must never be reordered/removed). The render brief is stored as JSON in `generationPrompt`.
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "scheduled", "published", "rejected", "failed", "needs_generation", "generating"]).default("draft").notNull(),
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
  isWinner: boolean("isWinner").default(false),
  parentPostId: int("parentPostId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentPost = typeof contentPosts.$inferSelect;
export type InsertContentPost = typeof contentPosts.$inferInsert;

// ─── Content Schedules ────────────────────────────────────────────────────────

export const contentSchedules = mysqlTable("content_schedules", {
  id: int("id").autoincrement().primaryKey(),
  // Nullable for legacy rows; backfilled to the default client by scripts/seed.ts.
  clientId: int("clientId"),
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
  // Nullable for legacy rows; backfilled to the default client by scripts/seed.ts.
  clientId: int("clientId"),
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
  // Nullable for legacy rows; backfilled to the default client by scripts/seed.ts.
  clientId: int("clientId"),
  postId: int("postId").notNull(),
  platform: mysqlEnum("platform", PLATFORM_VALUES).notNull(),
  eventType: mysqlEnum("eventType", ["published", "failed", "rejected", "approved", "scheduled"]).notNull(),
  metadata: text("metadata"), // JSON
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// ─── HeyGen Video Requests ────────────────────────────────────────────────────

export const heygenRequests = mysqlTable("heygen_requests", {
  id: int("id").autoincrement().primaryKey(),
  // Nullable for legacy rows; backfilled to the default client by scripts/seed.ts.
  clientId: int("clientId"),
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
