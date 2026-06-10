import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertClientAccess } from "../_core/clientScope";
import { trackedInvokeLLM } from "../_core/trackedLlm";
import {
  createBrainstormIdeas,
  createPreferenceSignal,
  getBrainstormIdeaById,
  getBrainstormIdeas,
  updateBrainstormIdea,
} from "../db";
import { buildBrainstormPrompt, loadPromptContext } from "../promptBuilder";
import { IDEA_TYPES, PLATFORMS, CONTENT_PILLARS } from "@shared/platforms";
import { protectedProcedure, router } from "../_core/trpc";

const IDEA_STATUS = z.enum(["proposed", "liked", "discarded", "saved", "promoted"]);

export const brainstormRouter = router({
  /** Generate a fresh deck of idea cards for the active client. */
  generateBrainstormIdeas: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      campaignId: z.number().optional(),
      count: z.number().min(3).max(20).default(10),
      theme: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const promptCtx = await loadPromptContext(input.clientId, { campaignId: input.campaignId });
      const { system, user } = buildBrainstormPrompt(promptCtx, {
        count: input.count,
        theme: input.theme,
      });

      const response = await trackedInvokeLLM(
        { messages: [{ role: "system", content: system }, { role: "user", content: user }], maxTokens: 4000 },
        { clientId: input.clientId, userId: ctx.user.id, taskType: "brainstorm", summary: input.theme ?? `${input.count} ideas` },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Idea generation failed" });

      let parsed: {
        ideas: Array<{
          type?: string;
          title?: string;
          hook?: string;
          description?: string;
          platform?: string;
          contentPillar?: string;
          visualConcept?: string;
          cta?: string;
        }>;
      };
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse generated ideas" });
      }
      if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Model returned no ideas" });
      }

      const validType = (t?: string) => (IDEA_TYPES.includes(t as any) ? (t as (typeof IDEA_TYPES)[number]) : "post_hook");
      const validPlatform = (p?: string) => (PLATFORMS.includes(p as any) ? p : null);
      const validPillar = (p?: string) => (CONTENT_PILLARS.includes(p as any) ? p : null);

      const rows = parsed.ideas.slice(0, input.count).map((idea) => ({
        clientId: input.clientId,
        campaignId: input.campaignId,
        type: validType(idea.type),
        title: idea.title?.slice(0, 500),
        hook: idea.hook?.slice(0, 500),
        description: idea.description,
        platform: validPlatform(idea.platform),
        contentPillar: validPillar(idea.contentPillar),
        visualConcept: idea.visualConcept,
        cta: idea.cta,
        status: "proposed" as const,
        source: "ai",
      }));

      const created = await createBrainstormIdeas(rows);
      // createBrainstormIdeas returns newest-first; present oldest-first for a stable deck.
      return [...created].reverse();
    }),

  getBrainstormIdeas: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      status: IDEA_STATUS.optional(),
      campaignId: z.number().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getBrainstormIdeas(input.clientId, {
        status: input.status,
        campaignId: input.campaignId,
        limit: input.limit,
      });
    }),

  /** Update an idea (swipe outcome, campaign attachment, edits). */
  updateBrainstormIdea: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientId: z.number(),
      status: IDEA_STATUS.optional(),
      campaignId: z.number().nullable().optional(),
      title: z.string().optional(),
      hook: z.string().optional(),
      description: z.string().optional(),
      score: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const idea = await getBrainstormIdeaById(input.id);
      if (!idea || idea.clientId !== input.clientId) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, clientId, ...data } = input;
      return updateBrainstormIdea(id, data);
    }),

  /** Record a learning signal (swipe, save, etc.). */
  savePreferenceSignal: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      signalType: z.enum(["idea_swipe", "post_approval", "post_rejection", "edit", "winner", "saved", "used_in_campaign"]),
      targetType: z.string().optional(),
      targetId: z.number().optional(),
      direction: z.enum(["positive", "negative"]),
      content: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      await createPreferenceSignal({
        ...input,
        userId: ctx.user.id,
      });
      return { success: true };
    }),
});
