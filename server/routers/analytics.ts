import { z } from "zod";
import {
  getAnalyticsByPlatform,
  getAnalyticsSummary,
  getContentPosts,
  getPublishedPostsOverTime,
  getRecentActivity,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  summary: protectedProcedure.query(async () => {
    return getAnalyticsSummary();
  }),

  byPlatform: protectedProcedure.query(async () => {
    return getAnalyticsByPlatform();
  }),

  recentActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return getRecentActivity(input.limit);
    }),

  publishedOverTime: protectedProcedure.query(async () => {
    return getPublishedPostsOverTime();
  }),

  recentPosts: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return getContentPosts({ status: "published", limit: input.limit });
    }),
});
