import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertClientAccess } from "../_core/clientScope";
import { createClient, getClients, updateClient } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const clientFields = {
  name: z.string().min(1).max(255),
  websiteUrl: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  primaryOffer: z.string().optional(),
  audience: z.string().optional(),
};

export const clientsRouter = router({
  list: protectedProcedure
    .input(z.object({ includeArchived: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      // Admins see every client; regular users see the ones they own.
      const userId = ctx.user.role === "admin" ? undefined : ctx.user.id;
      return getClients({ userId, includeArchived: input?.includeArchived ?? false });
    }),

  get: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      return assertClientAccess(ctx, input.clientId);
    }),

  create: protectedProcedure
    .input(z.object(clientFields))
    .mutation(async ({ ctx, input }) => {
      const client = await createClient({
        ...input,
        userId: ctx.user.id,
        status: "active",
      });
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return client;
    }),

  update: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      name: clientFields.name.optional(),
      websiteUrl: clientFields.websiteUrl,
      industry: clientFields.industry,
      description: clientFields.description,
      primaryOffer: clientFields.primaryOffer,
      audience: clientFields.audience,
      status: z.enum(["active", "paused", "archived"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const { clientId, ...data } = input;
      return updateClient(clientId, data);
    }),

  /** Soft delete — archives the client; its content stays intact. */
  archive: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return updateClient(input.clientId, { status: "archived" });
    }),
});
