import { z } from "zod";
import { createMediaAsset, deleteMediaAsset, getMediaAssets } from "../db";
import { assertClientAccess } from "../_core/clientScope";
import { protectedProcedure, router } from "../_core/trpc";

export const mediaRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.number(), type: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getMediaAssets(input.type, input.clientId);
    }),

  create: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      name: z.string(),
      type: z.enum(["image", "video", "audio", "document"]),
      url: z.string(),
      storageKey: z.string(),
      mimeType: z.string().optional(),
      sizeBytes: z.number().optional(),
      linkedPostId: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const { tags, ...rest } = input;
      return createMediaAsset({
        ...rest,
        tags: tags ? JSON.stringify(tags) : null,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMediaAsset(input.id);
      return { success: true };
    }),
});
