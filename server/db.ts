import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  analyticsEvents,
  brainstormIdeas,
  campaignContentItems,
  campaigns,
  clientBrandProfiles,
  clients,
  contentPerformanceSnapshots,
  contentPosts,
  contentSchedules,
  heygenRequests,
  InsertAnalyticsEvent,
  InsertBrainstormIdea,
  InsertCampaign,
  InsertCampaignContentItem,
  InsertClient,
  InsertClientBrandProfile,
  InsertContentPerformanceSnapshot,
  InsertContentPost,
  InsertContentSchedule,
  InsertHeygenRequest,
  InsertMediaAsset,
  InsertModelRun,
  InsertPlatformConnection,
  InsertPreferenceSignal,
  InsertUser,
  mediaAssets,
  modelRuns,
  platformConnections,
  preferenceSignals,
  users,
} from "../drizzle/schema";
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

/** First user row — fallback for the temporary dev-auth bypass when the owner
 *  can't be matched by email (Clerk-synced rows don't always store one). */
export async function getFirstUser() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).orderBy(users.id).limit(1);
  return result[0];
}

export async function createUserWithPassword(params: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    openId: params.openId,
    name: params.name,
    email: params.email,
    passwordHash: params.passwordHash,
    loginMethod: "email",
    role: params.role ?? "user",
    lastSignedIn: new Date(),
  });
  return getUserByEmail(params.email);
}

export async function updateUserPassword(openId: string, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.openId, openId));
}

// ─── Platform Connections ─────────────────────────────────────────────────────

/**
 * Connections are scoped per client. A connection with `clientId = null` is a
 * legacy/global row (pre-multi-client); it only matches when no clientId filter
 * is given. Credentials must NEVER leak across clients, so when a clientId is
 * provided we filter strictly on it.
 */
function platformConnectionScope(platform: string, clientId?: number | null) {
  const platformCond = eq(platformConnections.platform, platform as any);
  if (clientId === undefined || clientId === null) return platformCond;
  return and(platformCond, eq(platformConnections.clientId, clientId));
}

export async function getPlatformConnections(clientId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  if (clientId === undefined || clientId === null) {
    return db.select().from(platformConnections).orderBy(platformConnections.platform);
  }
  return db.select().from(platformConnections)
    .where(eq(platformConnections.clientId, clientId))
    .orderBy(platformConnections.platform);
}

export async function getPlatformConnection(platform: string, clientId?: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformConnections)
    .where(platformConnectionScope(platform, clientId)).limit(1);
  return result[0];
}

export async function upsertPlatformConnection(data: InsertPlatformConnection) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const scope = platformConnectionScope(data.platform, data.clientId);
  const existing = (await db.select().from(platformConnections).where(scope).limit(1))[0];
  if (existing) {
    await db.update(platformConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformConnections.id, existing.id));
    return (await db.select().from(platformConnections).where(eq(platformConnections.id, existing.id)).limit(1))[0];
  } else {
    await db.insert(platformConnections).values(data);
    return (await db.select().from(platformConnections).where(scope).orderBy(desc(platformConnections.id)).limit(1))[0];
  }
}

export async function updatePlatformStatus(platform: string, status: "connected" | "disconnected" | "error", errorMessage?: string, clientId?: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(platformConnections)
    .set({ status, errorMessage: errorMessage ?? null, lastCheckedAt: new Date(), updatedAt: new Date() })
    .where(platformConnectionScope(platform, clientId));
}

// ─── Content Posts ────────────────────────────────────────────────────────────

export async function getContentPosts(filters?: {
  status?: string;
  platform?: string;
  clientId?: number;
  campaignId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(contentPosts.status, filters.status as any));
  if (filters?.platform) conditions.push(eq(contentPosts.platform, filters.platform as any));
  if (filters?.clientId !== undefined) conditions.push(eq(contentPosts.clientId, filters.clientId));
  if (filters?.campaignId !== undefined) conditions.push(eq(contentPosts.campaignId, filters.campaignId));
  let query = db.select().from(contentPosts).orderBy(desc(contentPosts.createdAt));
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;
  if (filters?.limit) query = query.limit(filters.limit) as any;
  if (filters?.offset) query = query.offset(filters.offset) as any;
  return query;
}

export async function getContentPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentPosts).where(eq(contentPosts.id, id)).limit(1);
  return result[0];
}

export async function createContentPost(data: InsertContentPost) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(contentPosts).values(data);
  const result = await db.select().from(contentPosts)
    .orderBy(desc(contentPosts.id)).limit(1);
  return result[0];
}

export async function updateContentPost(id: number, data: Partial<InsertContentPost>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(contentPosts).set({ ...data, updatedAt: new Date() }).where(eq(contentPosts.id, id));
  return getContentPostById(id);
}

export async function deleteContentPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(contentPosts).where(eq(contentPosts.id, id));
}

export async function getScheduledPostsDue() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(contentPosts)
    .where(and(
      eq(contentPosts.status, "scheduled"),
      lte(contentPosts.scheduledAt, now)
    ));
}

export async function getPendingApprovalPosts(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  const statusCond = eq(contentPosts.status, "pending_approval");
  return db.select().from(contentPosts)
    .where(clientId === undefined ? statusCond : and(statusCond, eq(contentPosts.clientId, clientId)))
    .orderBy(desc(contentPosts.createdAt));
}

// ─── Content Schedules ────────────────────────────────────────────────────────

export async function getContentSchedules(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (clientId === undefined) {
    return db.select().from(contentSchedules).orderBy(contentSchedules.name);
  }
  return db.select().from(contentSchedules)
    .where(eq(contentSchedules.clientId, clientId))
    .orderBy(contentSchedules.name);
}

export async function getActiveSchedulesDue() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const results = await db
    .select()
    .from(contentSchedules)
    .where(eq(contentSchedules.isActive, true));
  // Include schedules with no nextRunAt yet, or where nextRunAt is past due
  return results.filter(s => !s.nextRunAt || s.nextRunAt <= now);
}

export async function getContentScheduleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentSchedules).where(eq(contentSchedules.id, id)).limit(1);
  return result[0];
}

export async function getScheduleByCronTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentSchedules)
    .where(eq(contentSchedules.cronTaskUid, taskUid)).limit(1);
  return result[0];
}

export async function createContentSchedule(data: InsertContentSchedule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(contentSchedules).values(data);
  const result = await db.select().from(contentSchedules).orderBy(desc(contentSchedules.id)).limit(1);
  return result[0];
}

export async function updateContentSchedule(id: number, data: Partial<InsertContentSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(contentSchedules).set({ ...data, updatedAt: new Date() }).where(eq(contentSchedules.id, id));
  return getContentScheduleById(id);
}

export async function deleteContentSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(contentSchedules).where(eq(contentSchedules.id, id));
}

// ─── Media Assets ─────────────────────────────────────────────────────────────

export async function getMediaAssets(type?: string, clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (type) conditions.push(eq(mediaAssets.type, type as any));
  if (clientId !== undefined) conditions.push(eq(mediaAssets.clientId, clientId));
  if (conditions.length > 0) {
    return db.select().from(mediaAssets).where(and(...conditions)).orderBy(desc(mediaAssets.createdAt));
  }
  return db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
}

/** Image assets linked to a post, in upload order — the carousel slide set (cover excluded; it lives on the post's imageUrl). */
export async function getImageAssetsForPost(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.linkedPostId, postId), eq(mediaAssets.type, "image")))
    .orderBy(mediaAssets.id);
}

export async function createMediaAsset(data: InsertMediaAsset) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(mediaAssets).values(data);
  const result = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.id)).limit(1);
  return result[0];
}

export async function deleteMediaAsset(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function recordAnalyticsEvent(data: InsertAnalyticsEvent) {
  const db = await getDb();
  if (!db) return;
  await db.insert(analyticsEvents).values(data);
}

export async function getAnalyticsSummary(clientId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, published: 0, scheduled: 0, pending: 0, rejected: 0, failed: 0 };
  const scoped = (cond?: ReturnType<typeof eq>) => {
    const conditions = [];
    if (cond) conditions.push(cond);
    if (clientId !== undefined) conditions.push(eq(contentPosts.clientId, clientId));
    return conditions.length > 0 ? and(...conditions) : undefined;
  };
  const count = (cond?: ReturnType<typeof eq>) => {
    const where = scoped(cond);
    const base = db.select({ count: sql<number>`count(*)` }).from(contentPosts);
    return where ? base.where(where) : base;
  };
  const [total, published, scheduled, pending, rejected, failed] = await Promise.all([
    count(),
    count(eq(contentPosts.status, "published")),
    count(eq(contentPosts.status, "scheduled")),
    count(eq(contentPosts.status, "pending_approval")),
    count(eq(contentPosts.status, "rejected")),
    count(eq(contentPosts.status, "failed")),
  ]);
  return {
    total: Number(total[0]?.count ?? 0),
    published: Number(published[0]?.count ?? 0),
    scheduled: Number(scheduled[0]?.count ?? 0),
    pending: Number(pending[0]?.count ?? 0),
    rejected: Number(rejected[0]?.count ?? 0),
    failed: Number(failed[0]?.count ?? 0),
  };
}

export async function getAnalyticsByPlatform(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  const platforms = ["instagram", "linkedin", "facebook", "youtube", "email", "whatsapp"] as const;
  const withClient = (cond: any) =>
    clientId === undefined ? cond : and(cond, eq(contentPosts.clientId, clientId));
  const results = await Promise.all(platforms.map(async (platform) => {
    const [total, published, scheduled] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(withClient(eq(contentPosts.platform, platform))),
      db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(withClient(and(eq(contentPosts.platform, platform), eq(contentPosts.status, "published")))),
      db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(withClient(and(eq(contentPosts.platform, platform), eq(contentPosts.status, "scheduled")))),
    ]);
    return {
      platform,
      total: Number(total[0]?.count ?? 0),
      published: Number(published[0]?.count ?? 0),
      scheduled: Number(scheduled[0]?.count ?? 0),
    };
  }));
  return results;
}

export async function getRecentActivity(limit = 20, clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (clientId === undefined) {
    return db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.recordedAt)).limit(limit);
  }
  return db.select().from(analyticsEvents)
    .where(eq(analyticsEvents.clientId, clientId))
    .orderBy(desc(analyticsEvents.recordedAt)).limit(limit);
}

export async function getPublishedPostsOverTime(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const conditions = [
    eq(contentPosts.status, "published"),
    gte(contentPosts.publishedAt, thirtyDaysAgo),
  ];
  if (clientId !== undefined) conditions.push(eq(contentPosts.clientId, clientId));
  return db.select({
    date: sql<string>`DATE(publishedAt)`,
    count: sql<number>`count(*)`,
    platform: contentPosts.platform,
  }).from(contentPosts)
    .where(and(...conditions))
    .groupBy(sql`DATE(publishedAt)`, contentPosts.platform)
    .orderBy(sql`DATE(publishedAt)`);
}

// ─── HeyGen ───────────────────────────────────────────────────────────────────

export async function getHeygenRequests(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (clientId === undefined) {
    return db.select().from(heygenRequests).orderBy(desc(heygenRequests.createdAt));
  }
  return db.select().from(heygenRequests)
    .where(eq(heygenRequests.clientId, clientId))
    .orderBy(desc(heygenRequests.createdAt));
}

export async function getHeygenRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(heygenRequests).where(eq(heygenRequests.id, id)).limit(1);
  return result[0];
}

export async function createHeygenRequest(data: InsertHeygenRequest) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(heygenRequests).values(data);
  const result = await db.select().from(heygenRequests).orderBy(desc(heygenRequests.id)).limit(1);
  return result[0];
}

export async function updateHeygenRequest(id: number, data: Partial<InsertHeygenRequest>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(heygenRequests).set({ ...data, updatedAt: new Date() }).where(eq(heygenRequests.id, id));
  return getHeygenRequestById(id);
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(opts?: { userId?: number; includeArchived?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.userId !== undefined) conditions.push(eq(clients.userId, opts.userId));
  if (!opts?.includeArchived) conditions.push(sql`${clients.status} != 'archived'`);
  if (conditions.length > 0) {
    return db.select().from(clients).where(and(...conditions)).orderBy(clients.name);
  }
  return db.select().from(clients).orderBy(clients.name);
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function getClientByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.name, name)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(clients).values(data);
  const result = await db.select().from(clients).orderBy(desc(clients.id)).limit(1);
  return result[0];
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id));
  return getClientById(id);
}

// ─── Client Brand Profiles ────────────────────────────────────────────────────

export async function getBrandProfileByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientBrandProfiles)
    .where(eq(clientBrandProfiles.clientId, clientId)).limit(1);
  return result[0];
}

export async function upsertBrandProfile(clientId: number, data: Partial<InsertClientBrandProfile>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getBrandProfileByClientId(clientId);
  if (existing) {
    await db.update(clientBrandProfiles)
      .set({ ...data, clientId, updatedAt: new Date() })
      .where(eq(clientBrandProfiles.id, existing.id));
  } else {
    await db.insert(clientBrandProfiles).values({ ...data, clientId });
  }
  return getBrandProfileByClientId(clientId);
}

// ─── Preference Signals ───────────────────────────────────────────────────────

export async function createPreferenceSignal(data: InsertPreferenceSignal) {
  const db = await getDb();
  if (!db) return;
  await db.insert(preferenceSignals).values(data);
}

export async function getPreferenceSignals(clientId: number, opts?: { limit?: number; direction?: "positive" | "negative" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(preferenceSignals.clientId, clientId)];
  if (opts?.direction) conditions.push(eq(preferenceSignals.direction, opts.direction));
  return db.select().from(preferenceSignals)
    .where(and(...conditions))
    .orderBy(desc(preferenceSignals.createdAt))
    .limit(opts?.limit ?? 50);
}

// ─── Brainstorm Ideas ─────────────────────────────────────────────────────────

export async function getBrainstormIdeas(clientId: number, opts?: { status?: string; campaignId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(brainstormIdeas.clientId, clientId)];
  if (opts?.status) conditions.push(eq(brainstormIdeas.status, opts.status as any));
  if (opts?.campaignId !== undefined) conditions.push(eq(brainstormIdeas.campaignId, opts.campaignId));
  return db.select().from(brainstormIdeas)
    .where(and(...conditions))
    .orderBy(desc(brainstormIdeas.createdAt))
    .limit(opts?.limit ?? 100);
}

export async function getBrainstormIdeaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brainstormIdeas).where(eq(brainstormIdeas.id, id)).limit(1);
  return result[0];
}

export async function createBrainstormIdeas(rows: InsertBrainstormIdea[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (rows.length === 0) return [];
  await db.insert(brainstormIdeas).values(rows);
  const clientId = rows[0].clientId;
  return db.select().from(brainstormIdeas)
    .where(eq(brainstormIdeas.clientId, clientId))
    .orderBy(desc(brainstormIdeas.id))
    .limit(rows.length);
}

export async function updateBrainstormIdea(id: number, data: Partial<InsertBrainstormIdea>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(brainstormIdeas).set({ ...data, updatedAt: new Date() }).where(eq(brainstormIdeas.id, id));
  return getBrainstormIdeaById(id);
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaigns(clientId: number, opts?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(campaigns.clientId, clientId)];
  if (opts?.status) conditions.push(eq(campaigns.status, opts.status as any));
  return db.select().from(campaigns)
    .where(and(...conditions))
    .orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(campaigns).values(data);
  const result = await db.select().from(campaigns).orderBy(desc(campaigns.id)).limit(1);
  return result[0];
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(campaigns).set({ ...data, updatedAt: new Date() }).where(eq(campaigns.id, id));
  return getCampaignById(id);
}

export async function getCampaignContentItems(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignContentItems)
    .where(eq(campaignContentItems.campaignId, campaignId))
    .orderBy(campaignContentItems.plannedDate);
}

export async function getCampaignContentItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaignContentItems).where(eq(campaignContentItems.id, id)).limit(1);
  return result[0];
}

export async function createCampaignContentItems(rows: InsertCampaignContentItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (rows.length === 0) return [];
  await db.insert(campaignContentItems).values(rows);
  return getCampaignContentItems(rows[0].campaignId);
}

export async function updateCampaignContentItem(id: number, data: Partial<InsertCampaignContentItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(campaignContentItems).set({ ...data, updatedAt: new Date() }).where(eq(campaignContentItems.id, id));
  return getCampaignContentItemById(id);
}

// ─── Content Performance Snapshots ────────────────────────────────────────────

export async function createPerformanceSnapshot(data: InsertContentPerformanceSnapshot) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(contentPerformanceSnapshots).values(data);
}

export async function getPerformanceSnapshots(clientId: number, opts?: { contentPostId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(contentPerformanceSnapshots.clientId, clientId)];
  if (opts?.contentPostId !== undefined) conditions.push(eq(contentPerformanceSnapshots.contentPostId, opts.contentPostId));
  return db.select().from(contentPerformanceSnapshots)
    .where(and(...conditions))
    .orderBy(desc(contentPerformanceSnapshots.capturedAt))
    .limit(opts?.limit ?? 200);
}

// ─── Model Runs ───────────────────────────────────────────────────────────────

export async function createModelRun(data: InsertModelRun) {
  const db = await getDb();
  if (!db) return;
  await db.insert(modelRuns).values(data);
}

export async function getModelRunSummary(clientId?: number) {
  const db = await getDb();
  if (!db) return { runs: 0, inputTokens: 0, outputTokens: 0, estimatedCostMicros: 0 };
  const base = db.select({
    runs: sql<number>`count(*)`,
    inputTokens: sql<number>`coalesce(sum(inputTokens), 0)`,
    outputTokens: sql<number>`coalesce(sum(outputTokens), 0)`,
    estimatedCostMicros: sql<number>`coalesce(sum(estimatedCostMicros), 0)`,
  }).from(modelRuns);
  const result = clientId === undefined
    ? await base
    : await base.where(eq(modelRuns.clientId, clientId));
  return {
    runs: Number(result[0]?.runs ?? 0),
    inputTokens: Number(result[0]?.inputTokens ?? 0),
    outputTokens: Number(result[0]?.outputTokens ?? 0),
    estimatedCostMicros: Number(result[0]?.estimatedCostMicros ?? 0),
  };
}

export async function getModelRuns(clientId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  if (clientId === undefined) {
    return db.select().from(modelRuns).orderBy(desc(modelRuns.createdAt)).limit(limit);
  }
  return db.select().from(modelRuns)
    .where(eq(modelRuns.clientId, clientId))
    .orderBy(desc(modelRuns.createdAt)).limit(limit);
}

// ─── Backfill (legacy single-tenant rows → default client) ────────────────────

/** Assign all legacy rows (clientId IS NULL) to the given client. Idempotent. */
export async function backfillClientId(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(contentPosts).set({ clientId }).where(isNull(contentPosts.clientId));
  await db.update(contentSchedules).set({ clientId }).where(isNull(contentSchedules.clientId));
  await db.update(mediaAssets).set({ clientId }).where(isNull(mediaAssets.clientId));
  await db.update(analyticsEvents).set({ clientId }).where(isNull(analyticsEvents.clientId));
  await db.update(heygenRequests).set({ clientId }).where(isNull(heygenRequests.clientId));
  await db.update(platformConnections).set({ clientId }).where(isNull(platformConnections.clientId));
}
