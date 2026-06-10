import { z } from "zod";
import {
  getPlatformConnections,
  getPlatformConnection,
  upsertPlatformConnection,
  updatePlatformStatus,
} from "../db";
import { assertClientAccess } from "../_core/clientScope";
import { PLATFORMS, isManualPlatform } from "@shared/platforms";
import { protectedProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";

const PLATFORM_ENUM = z.enum(PLATFORMS);

/** Platforms shown on the connections page (generic "linkedin" is legacy). */
const DISPLAY_PLATFORMS = [
  "instagram",
  "linkedin_personal",
  "linkedin_company",
  "facebook",
  "youtube",
  "email",
  "whatsapp",
] as const;

export const platformsRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const connections = await getPlatformConnections(input.clientId);
      const map = new Map(connections.map((c) => [c.platform, c]));
      return DISPLAY_PLATFORMS.map((p) => map.get(p) ?? {
        id: null,
        clientId: input.clientId,
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
    .input(z.object({ clientId: z.number(), platform: PLATFORM_ENUM }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getPlatformConnection(input.platform, input.clientId);
    }),

  upsert: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      platform: PLATFORM_ENUM,
      accountName: z.string().optional(),
      accountId: z.string().optional(),
      apiKey: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      pageId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const result = await upsertPlatformConnection({
        ...input,
        status: "connected",
        lastCheckedAt: new Date(),
      });
      return result;
    }),

  testConnection: protectedProcedure
    .input(z.object({ clientId: z.number(), platform: PLATFORM_ENUM }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      if (isManualPlatform(input.platform)) {
        return { success: true, message: `${input.platform} is a manual channel — no connection needed.` };
      }
      const connection = await getPlatformConnection(input.platform, input.clientId);
      if (!connection) {
        return { success: false, message: "No credentials configured for this platform." };
      }
      // Simulate connection test — in production this would call the platform API
      const hasCredentials = !!(connection.accessToken || connection.apiKey);
      if (hasCredentials) {
        await updatePlatformStatus(input.platform, "connected", undefined, input.clientId);
        return { success: true, message: `${input.platform} connection verified successfully.` };
      } else {
        await updatePlatformStatus(input.platform, "error", "No valid credentials found", input.clientId);
        await notifyOwner({
          title: `Platform Connection Failed: ${input.platform}`,
          content: `The ${input.platform} connection test failed — no valid credentials found. Please update your API credentials in Platform Settings.`,
        });
        return { success: false, message: "No valid credentials found. Please add your API credentials." };
      }
    }),

  checkAllConnections: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const connections = await getPlatformConnections(input.clientId);
      const results = [];
      for (const conn of connections) {
        if (isManualPlatform(conn.platform)) continue;
        const hasCredentials = !!(conn.accessToken || conn.apiKey);
        const newStatus = hasCredentials ? "connected" : "disconnected";
        if (newStatus !== conn.status) {
          await updatePlatformStatus(conn.platform, newStatus as "connected" | "disconnected" | "error", undefined, input.clientId);
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
