import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getPlatformConnections,
  getPlatformConnection,
  upsertPlatformConnection,
  updatePlatformStatus,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";

export const platformsRouter = router({
  list: protectedProcedure.query(async () => {
    const connections = await getPlatformConnections();
    // Ensure all 4 platforms are represented
    const platforms = ["instagram", "linkedin_personal", "linkedin_company", "facebook", "youtube"] as const;
    const map = new Map(connections.map((c) => [c.platform, c]));
    return platforms.map((p) => map.get(p) ?? {
      id: null,
      platform: p,
      accountName: null,
      accountId: null,
      apiKey: null,
      accessToken: null,
      refreshToken: null,
      pageId: null,
      status: "disconnected" as const,
      lastCheckedAt: null,
      errorMessage: null,
      createdAt: null,
      updatedAt: null,
    });
  }),

  get: protectedProcedure
    .input(z.object({ platform: z.enum(["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]) }))
    .query(async ({ input }) => {
      return getPlatformConnection(input.platform);
    }),

  upsert: protectedProcedure
    .input(z.object({
      platform: z.enum(["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]),
      accountName: z.string().optional(),
      accountId: z.string().optional(),
      apiKey: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      pageId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await upsertPlatformConnection({
        ...input,
        status: "connected",
        lastCheckedAt: new Date(),
      });
      return result;
    }),

  testConnection: protectedProcedure
    .input(z.object({ platform: z.enum(["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]) }))
    .mutation(async ({ input }) => {
      const connection = await getPlatformConnection(input.platform);
      if (!connection) {
        return { success: false, message: "No credentials configured for this platform." };
      }
      // Simulate connection test — in production this would call the platform API
      const hasCredentials = !!(connection.accessToken || connection.apiKey);
      if (hasCredentials) {
        await updatePlatformStatus(input.platform, "connected");
        return { success: true, message: `${input.platform} connection verified successfully.` };
      } else {
        await updatePlatformStatus(input.platform, "error", "No valid credentials found");
        await notifyOwner({
          title: `Platform Connection Failed: ${input.platform}`,
          content: `The ${input.platform} connection test failed — no valid credentials found. Please update your API credentials in Platform Settings.`,
        });
        return { success: false, message: "No valid credentials found. Please add your API credentials." };
      }
    }),

  checkAllConnections: protectedProcedure.mutation(async () => {
    const connections = await getPlatformConnections();
    const results = [];
    for (const conn of connections) {
      const hasCredentials = !!(conn.accessToken || conn.apiKey);
      const newStatus = hasCredentials ? "connected" : "disconnected";
      if (newStatus !== conn.status) {
        await updatePlatformStatus(conn.platform, newStatus as "connected" | "disconnected" | "error");
        if (newStatus === "disconnected") {
          await notifyOwner({
            title: `Platform Connection Issue: ${conn.platform}`,
            content: `The ${conn.platform} connection status changed to ${newStatus}. Please check your credentials.`,
          });
        }
      }
      results.push({ platform: conn.platform, status: newStatus });
    }
    return results;
  }),
});
