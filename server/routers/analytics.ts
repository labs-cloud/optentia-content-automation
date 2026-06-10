import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertClientAccess } from "../_core/clientScope";
import { trackedInvokeLLM } from "../_core/trackedLlm";
import {
  createPerformanceSnapshot,
  getAnalyticsByPlatform,
  getAnalyticsSummary,
  getContentPostById,
  getContentPosts,
  getModelRunSummary,
  getPerformanceSnapshots,
  getPreferenceSignals,
  getPublishedPostsOverTime,
  getRecentActivity,
} from "../db";
import { buildWeeklyReportPrompt, loadPromptContext } from "../promptBuilder";
import { protectedProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  summary: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getAnalyticsSummary(input.clientId);
    }),

  byPlatform: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getAnalyticsByPlatform(input.clientId);
    }),

  recentActivity: protectedProcedure
    .input(z.object({ clientId: z.number(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getRecentActivity(input.limit, input.clientId);
    }),

  publishedOverTime: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getPublishedPostsOverTime(input.clientId);
    }),

  recentPosts: protectedProcedure
    .input(z.object({ clientId: z.number(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getContentPosts({ clientId: input.clientId, status: "published", limit: input.limit });
    }),

  /** Winners + recently published — the "what's working" shortlist. */
  topPosts: protectedProcedure
    .input(z.object({ clientId: z.number(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const posts = await getContentPosts({ clientId: input.clientId, limit: 200 });
      const winners = posts.filter((p) => p.isWinner);
      const published = posts.filter((p) => p.status === "published" && !p.isWinner);
      return [...winners, ...published].slice(0, input.limit);
    }),

  /** LLM usage + estimated spend for the client (cost control). */
  modelRunSummary: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getModelRunSummary(input.clientId);
    }),

  recordSnapshot: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      contentPostId: z.number(),
      impressions: z.number().default(0),
      likes: z.number().default(0),
      comments: z.number().default(0),
      shares: z.number().default(0),
      saves: z.number().default(0),
      clicks: z.number().default(0),
      leads: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const post = await getContentPostById(input.contentPostId);
      if (!post || post.clientId !== input.clientId) throw new TRPCError({ code: "NOT_FOUND" });
      const interactions = input.likes + input.comments + input.shares + input.saves + input.clicks;
      const engagementRateBps = input.impressions > 0
        ? Math.round((interactions / input.impressions) * 10000)
        : null;
      await createPerformanceSnapshot({
        ...input,
        platform: post.platform,
        engagementRateBps,
      });
      return { success: true };
    }),

  getSnapshots: protectedProcedure
    .input(z.object({ clientId: z.number(), contentPostId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getPerformanceSnapshots(input.clientId, { contentPostId: input.contentPostId });
    }),

  /** AI weekly report: what worked / failed / repeat / stop / repurpose / next. */
  generateWeeklyReport: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const promptCtx = await loadPromptContext(input.clientId);

      const [summary, posts, signals, byPlatform] = await Promise.all([
        getAnalyticsSummary(input.clientId),
        getContentPosts({ clientId: input.clientId, limit: 100 }),
        getPreferenceSignals(input.clientId, { limit: 15 }),
        getAnalyticsByPlatform(input.clientId),
      ]);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentPosts = posts.filter((p) => p.createdAt >= weekAgo || p.isWinner);
      const pillarCounts = new Map<string, number>();
      for (const p of recentPosts) {
        const key = p.contentPillar ?? "unspecified";
        pillarCounts.set(key, (pillarCounts.get(key) ?? 0) + 1);
      }

      const { system, user } = buildWeeklyReportPrompt(promptCtx, {
        periodLabel: `${weekAgo.toISOString().slice(0, 10)} → ${new Date().toISOString().slice(0, 10)}`,
        summary,
        topPosts: recentPosts.slice(0, 10).map((p) => ({
          title: p.title,
          platform: p.platform,
          status: p.status,
          isWinner: p.isWinner,
        })),
        pillarBreakdown: [...pillarCounts.entries()].map(([pillar, count]) => ({ pillar, count })),
        platformBreakdown: byPlatform.map((p) => ({ platform: p.platform, published: p.published, total: p.total })),
        recentSignals: signals.map((s) => ({ direction: s.direction, content: s.content })),
      });

      const response = await trackedInvokeLLM(
        { messages: [{ role: "system", content: system }, { role: "user", content: user }], maxTokens: 3000 },
        { clientId: input.clientId, userId: ctx.user.id, taskType: "weekly_report", summary: promptCtx.client.name },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Report generation failed" });
      try {
        const report = JSON.parse(content) as {
          headline?: string;
          whatWorked?: string[];
          whatFailed?: string[];
          whatToRepeat?: string[];
          whatToStop?: string[];
          whatToRepurpose?: string[];
          whatToGenerateNext?: string[];
        };
        return { ...report, generatedAt: new Date().toISOString() };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse weekly report" });
      }
    }),
});
