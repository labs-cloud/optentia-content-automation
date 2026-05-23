import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getContentPosts: vi.fn().mockResolvedValue([]),
  getPendingApprovalPosts: vi.fn().mockResolvedValue([]),
  getContentPostById: vi.fn().mockResolvedValue(null),
  createContentPost: vi.fn().mockResolvedValue({ id: 1, title: "Test", caption: "Test caption", platform: "instagram", status: "pending_approval", aiGenerated: false, createdAt: new Date() }),
  updateContentPost: vi.fn().mockResolvedValue({ id: 1, status: "approved" }),
  deleteContentPost: vi.fn().mockResolvedValue(undefined),
  recordAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
  getPlatformConnections: vi.fn().mockResolvedValue([]),
  getPlatformConnection: vi.fn().mockResolvedValue(null),
  upsertPlatformConnection: vi.fn().mockResolvedValue({ id: 1, platform: "instagram", status: "connected" }),
  updatePlatformStatus: vi.fn().mockResolvedValue(undefined),
  getAnalyticsSummary: vi.fn().mockResolvedValue({ total: 10, published: 5, scheduled: 2, pending: 2, rejected: 1, failed: 0 }),
  getAnalyticsByPlatform: vi.fn().mockResolvedValue([
    { platform: "instagram", total: 4, published: 2, scheduled: 1 },
    { platform: "linkedin", total: 3, published: 2, scheduled: 0 },
    { platform: "facebook", total: 2, published: 1, scheduled: 1 },
    { platform: "youtube", total: 1, published: 0, scheduled: 0 },
  ]),
  getRecentActivity: vi.fn().mockResolvedValue([]),
  getPublishedPostsOverTime: vi.fn().mockResolvedValue([]),
  getContentSchedules: vi.fn().mockResolvedValue([]),
  getContentScheduleById: vi.fn().mockResolvedValue(null),
  createContentSchedule: vi.fn().mockResolvedValue({ id: 1, name: "Test", cron: "0 0 9 * * *", platforms: '["instagram"]', postsPerRun: 1, isActive: true }),
  updateContentSchedule: vi.fn().mockResolvedValue(undefined),
  deleteContentSchedule: vi.fn().mockResolvedValue(undefined),
  getScheduleByCronTaskUid: vi.fn().mockResolvedValue(null),
  getMediaAssets: vi.fn().mockResolvedValue([]),
  createMediaAsset: vi.fn().mockResolvedValue({ id: 1 }),
  deleteMediaAsset: vi.fn().mockResolvedValue(undefined),
  getHeygenRequests: vi.fn().mockResolvedValue([]),
  getHeygenRequestById: vi.fn().mockResolvedValue(null),
  createHeygenRequest: vi.fn().mockResolvedValue({ id: 1, title: "Test Video", scriptText: "Hello world", status: "pending" }),
  updateHeygenRequest: vi.fn().mockResolvedValue({ id: 1, status: "processing" }),
  getScheduledPostsDue: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

// ─── Mock LLM ─────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          caption: "AI automation is transforming how businesses operate.",
          hashtags: "#automation #ai #business",
          hook: "Most businesses are leaving 40% efficiency on the table.",
          scriptText: "Welcome to this video about AI automation...",
        }),
      },
    }],
  }),
}));

// ─── Mock image generation ──────────────────────────────────────────────────
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/generated-image.png" }),
}));

// ─── Mock notifications ───────────────────────────────────────────────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Mock heartbeat ───────────────────────────────────────────────────────────
vi.mock("./_core/heartbeat", () => ({
  createHeartbeatJob: vi.fn().mockResolvedValue({ taskUid: "test-uid-123" }),
  updateHeartbeatJob: vi.fn().mockResolvedValue(undefined),
  deleteHeartbeatJob: vi.fn().mockResolvedValue(undefined),
}));

// ─── Context factory ──────────────────────────────────────────────────────────
function makeCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "owner-open-id",
      name: "Test Owner",
      email: "owner@optentia.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { cookie: "" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("posts router", () => {
  it("lists posts", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("lists pending approval posts", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.pendingApproval();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a manual post", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.create({
      caption: "Test caption for Instagram",
      platform: "instagram",
      contentType: "text",
    });
    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
  });

  it("generates AI content for instagram", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.generateAI({
      platform: "instagram",
      contentPillar: "strong_opinion",
      autoSubmitForApproval: true,
    });
    expect(result).toBeDefined();
  });

  it("generates AI content for linkedin", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.posts.generateAI({
      platform: "linkedin",
      contentPillar: "practical_education",
      topic: "CRM automation workflows",
      autoSubmitForApproval: false,
    });
    expect(result).toBeDefined();
  });
});

describe("platforms router", () => {
  it("lists all 4 platforms", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.platforms.list();
    expect(result).toHaveLength(4);
    const platformNames = result.map((p) => p.platform);
    expect(platformNames).toContain("instagram");
    expect(platformNames).toContain("linkedin");
    expect(platformNames).toContain("facebook");
    expect(platformNames).toContain("youtube");
  });

  it("upserts platform credentials", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.platforms.upsert({
      platform: "instagram",
      accountName: "@optentia",
      accessToken: "test-token-123",
    });
    expect(result).toBeDefined();
  });
});

describe("analytics router", () => {
  it("returns summary stats", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.analytics.summary();
    expect(result).toBeDefined();
    expect(result?.total).toBe(10);
    expect(result?.published).toBe(5);
    expect(result?.pending).toBe(2);
  });

  it("returns platform breakdown", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.analytics.byPlatform();
    expect(result).toHaveLength(4);
    const instagram = result.find((p) => p.platform === "instagram");
    expect(instagram?.total).toBe(4);
  });
});

describe("heygen router", () => {
  it("lists heygen requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.heygen.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a heygen request without API key", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.heygen.createRequest({
      title: "AI Automation Explained",
      scriptText: "Welcome to this video about how AI is changing business operations...",
    });
    expect(result).toBeDefined();
    expect(result?.title).toBe("Test Video");
  });
});

describe("auth router", () => {
  it("returns current user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result?.name).toBe("Test Owner");
    expect(result?.role).toBe("admin");
  });

  it("logout clears session cookie", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
