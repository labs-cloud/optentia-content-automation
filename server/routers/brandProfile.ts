import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertClientAccess } from "../_core/clientScope";
import { trackedInvokeLLM } from "../_core/trackedLlm";
import {
  getBrandProfileByClientId,
  getPreferenceSignals,
  upsertBrandProfile,
} from "../db";
import { buildBrandProfilePrompt } from "../promptBuilder";
import { protectedProcedure, router } from "../_core/trpc";

const profileFields = {
  voice: z.string().optional(),
  tone: z.string().optional(),
  audience: z.string().optional(),
  buyerPains: z.string().optional(),
  offers: z.string().optional(),
  proofPoints: z.string().optional(),
  competitors: z.string().optional(),
  visualStyle: z.string().optional(),
  ctaStyle: z.string().optional(),
  forbiddenPhrases: z.string().optional(),
  brandSummary: z.string().optional(),
};

export const brandProfileRouter = router({
  get: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const profile = await getBrandProfileByClientId(input.clientId);
      return profile ?? null;
    }),

  update: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      ...profileFields,
      approvedExamples: z.array(z.string()).optional(),
      rejectedExamples: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const { clientId, ...data } = input;
      return upsertBrandProfile(clientId, data);
    }),

  /** Recent preference signals — shown in the Brand Brain learning feed. */
  signals: protectedProcedure
    .input(z.object({ clientId: z.number(), limit: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getPreferenceSignals(input.clientId, { limit: input.limit });
    }),

  /**
   * Generate (or regenerate) the Brand Operating Profile from the client's
   * info plus optional pasted source material (website copy, about text…).
   */
  generateBrandProfile: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      sourceText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await assertClientAccess(ctx, input.clientId);
      const existingProfile = await getBrandProfileByClientId(input.clientId);
      const { system, user } = buildBrandProfilePrompt(client, {
        sourceText: input.sourceText,
        existingProfile,
      });

      const response = await trackedInvokeLLM(
        { messages: [{ role: "system", content: system }, { role: "user", content: user }], maxTokens: 3000 },
        { clientId: input.clientId, userId: ctx.user.id, taskType: "brand_profile", summary: client.name },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Brand profile generation failed" });

      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse generated brand profile" });
      }

      const str = (key: string) => (typeof parsed[key] === "string" ? parsed[key] : undefined);
      return upsertBrandProfile(input.clientId, {
        voice: str("voice"),
        tone: str("tone"),
        audience: str("audience"),
        buyerPains: str("buyerPains"),
        offers: str("offers"),
        proofPoints: str("proofPoints"),
        competitors: str("competitors"),
        visualStyle: str("visualStyle"),
        ctaStyle: str("ctaStyle"),
        forbiddenPhrases: str("forbiddenPhrases"),
        brandSummary: str("brandSummary"),
      });
    }),
});
