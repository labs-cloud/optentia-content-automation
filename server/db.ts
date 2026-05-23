import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  analyticsEvents,
  contentPosts,
  contentSchedules,
  heygenRequests,
  InsertAnalyticsEvent,
  InsertContentPost,
  InsertContentSchedule,
  InsertHeygenRequest,
  InsertMediaAsset,
  InsertPlatformConnection,
  InsertUser,
  mediaAssets,
  platformConnections,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
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

// ─── Platform Connections ─────────────────────────────────────────────────────

export async function getPlatformConnections() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformConnections).orderBy(platformConnections.platform);
}

export async function getPlatformConnection(platform: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformConnections)
    .where(eq(platformConnections.platform, platform as any)).limit(1);
  return result[0];
}

export async function upsertPlatformConnection(data: InsertPlatformConnection) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getPlatformConnection(data.platform);
  if (existing) {
    await db.update(platformConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformConnections.platform, data.platform));
    return (await db.select().from(platformConnections).where(eq(platformConnections.platform, data.platform)).limit(1))[0];
  } else {
    await db.insert(platformConnections).values(data);
    return (await db.select().from(platformConnections).where(eq(platformConnections.platform, data.platform)).limit(1))[0];
  }
}

export async function updatePlatformStatus(platform: string, status: "connected" | "disconnected" | "error", errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(platformConnections)
    .set({ status, errorMessage: errorMessage ?? null, lastCheckedAt: new Date(), updatedAt: new Date() })
    .where(eq(platformConnections.platform, platform as any));
}

// ─── Content Posts ────────────────────────────────────────────────────────────

export async function getContentPosts(filters?: {
  status?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(contentPosts.status, filters.status as any));
  if (filters?.platform) conditions.push(eq(contentPosts.platform, filters.platform as any));
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

export async function getPendingApprovalPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentPosts)
    .where(eq(contentPosts.status, "pending_approval"))
    .orderBy(desc(contentPosts.createdAt));
}

// ─── Content Schedules ────────────────────────────────────────────────────────

export async function getContentSchedules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentSchedules).orderBy(contentSchedules.name);
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

export async function getMediaAssets(type?: string) {
  const db = await getDb();
  if (!db) return [];
  if (type) {
    return db.select().from(mediaAssets).where(eq(mediaAssets.type, type as any)).orderBy(desc(mediaAssets.createdAt));
  }
  return db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
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

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return { total: 0, published: 0, scheduled: 0, pending: 0, rejected: 0, failed: 0 };
  const [total, published, scheduled, pending, rejected, failed] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(contentPosts),
    db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(eq(contentPosts.status, "published")),
    db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(eq(contentPosts.status, "scheduled")),
    db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(eq(contentPosts.status, "pending_approval")),
    db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(eq(contentPosts.status, "rejected")),
    db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(eq(contentPosts.status, "failed")),
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

export async function getAnalyticsByPlatform() {
  const db = await getDb();
  if (!db) return [];
  const platforms = ["instagram", "linkedin", "facebook", "youtube"] as const;
  const results = await Promise.all(platforms.map(async (platform) => {
    const [total, published, scheduled] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(eq(contentPosts.platform, platform)),
      db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(and(eq(contentPosts.platform, platform), eq(contentPosts.status, "published"))),
      db.select({ count: sql<number>`count(*)` }).from(contentPosts).where(and(eq(contentPosts.platform, platform), eq(contentPosts.status, "scheduled"))),
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

export async function getRecentActivity(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.recordedAt)).limit(limit);
}

export async function getPublishedPostsOverTime() {
  const db = await getDb();
  if (!db) return [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return db.select({
    date: sql<string>`DATE(publishedAt)`,
    count: sql<number>`count(*)`,
    platform: contentPosts.platform,
  }).from(contentPosts)
    .where(and(
      eq(contentPosts.status, "published"),
      gte(contentPosts.publishedAt, thirtyDaysAgo)
    ))
    .groupBy(sql`DATE(publishedAt)`, contentPosts.platform)
    .orderBy(sql`DATE(publishedAt)`);
}

// ─── HeyGen ───────────────────────────────────────────────────────────────────

export async function getHeygenRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(heygenRequests).orderBy(desc(heygenRequests.createdAt));
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
