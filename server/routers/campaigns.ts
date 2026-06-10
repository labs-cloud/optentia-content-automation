import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertClientAccess } from "../_core/clientScope";
import { trackedInvokeLLM } from "../_core/trackedLlm";
import { generateImage } from "../_core/imageGeneration";
import {
  createCampaign,
  createCampaignContentItems,
  createContentPost,
  createPreferenceSignal,
  getBrainstormIdeaById,
  getCampaignById,
  getCampaignContentItems,
  getCampaigns,
  getContentPosts,
  updateBrainstormIdea,
  updateCampaign,
  updateCampaignContentItem,
} from "../db";
import {
  buildCampaignPlanPrompt,
  buildImagePrompt,
  buildPostPrompt,
  loadPromptContext,
} from "../promptBuilder";
import { PLATFORMS, CAMPAIGN_GOALS, CONTENT_PILLARS, type ContentPillar, type Platform } from "@shared/platforms";
import { protectedProcedure, router } from "../_core/trpc";

const PLATFORM_ENUM = z.enum(PLATFORMS);
const GOAL_ENUM = z.enum(CAMPAIGN_GOALS);

async function assertCampaignAccess(ctx: any, clientId: number, campaignId: number) {
  await assertClientAccess(ctx, clientId);
  const campaign = await getCampaignById(campaignId);
  if (!campaign || campaign.clientId !== clientId) throw new TRPCError({ code: "NOT_FOUND" });
  return campaign;
}

export const campaignsRouter = router({
  getCampaigns: protectedProcedure
    .input(z.object({ clientId: z.number(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getCampaigns(input.clientId, { status: input.status });
    }),

  getCampaignById: protectedProcedure
    .input(z.object({ clientId: z.number(), id: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await assertCampaignAccess(ctx, input.clientId, input.id);
      const [items, posts] = await Promise.all([
        getCampaignContentItems(campaign.id),
        getContentPosts({ clientId: input.clientId, campaignId: campaign.id, limit: 200 }),
      ]);
      return { ...campaign, items, posts };
    }),

  createCampaign: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      name: z.string().min(1).max(255),
      goal: GOAL_ENUM,
      durationDays: z.number().min(3).max(90).default(14),
      platforms: z.array(PLATFORM_ENUM).min(1),
      offer: z.string().optional(),
      brief: z.string().optional(),
      startDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const startDate = input.startDate ? new Date(input.startDate) : new Date();
      const endDate = new Date(startDate.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
      const campaign = await createCampaign({
        clientId: input.clientId,
        name: input.name,
        goal: input.goal,
        durationDays: input.durationDays,
        platforms: input.platforms,
        offer: input.offer,
        brief: input.brief,
        status: "draft",
        startDate,
        endDate,
      });
      if (!campaign) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return campaign;
    }),

  /**
   * Generate the campaign thesis + content plan from the brand profile and
   * any liked brainstorm ideas attached to the call.
   */
  generateCampaign: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      campaignId: z.number(),
      ideaIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await assertCampaignAccess(ctx, input.clientId, input.campaignId);
      const promptCtx = await loadPromptContext(input.clientId);

      const likedIdeas = [];
      for (const ideaId of input.ideaIds ?? []) {
        const idea = await getBrainstormIdeaById(ideaId);
        if (idea && idea.clientId === input.clientId) likedIdeas.push(idea);
      }

      const platforms = Array.isArray(campaign.platforms)
        ? (campaign.platforms as string[])
        : ["instagram", "linkedin_personal"];

      const { system, user } = buildCampaignPlanPrompt(promptCtx, {
        name: campaign.name,
        goal: campaign.goal,
        durationDays: campaign.durationDays,
        platforms,
        brief: campaign.brief ?? undefined,
        likedIdeas,
      });

      const response = await trackedInvokeLLM(
        { messages: [{ role: "system", content: system }, { role: "user", content: user }], maxTokens: 6000 },
        { clientId: input.clientId, userId: ctx.user.id, taskType: "campaign_plan", summary: campaign.name },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campaign generation failed" });

      let parsed: {
        thesis?: string;
        offer?: string;
        items?: Array<{
          conceptTitle?: string;
          conceptDescription?: string;
          platform?: string;
          contentPillar?: string;
          dayOffset?: number;
          role?: string;
        }>;
      };
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse campaign plan" });
      }
      if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Model returned no campaign items" });
      }

      const start = campaign.startDate ?? new Date();
      const validPlatform = (p?: string) => (PLATFORMS.includes(p as any) ? p! : platforms[0]);
      const validPillar = (p?: string) => (CONTENT_PILLARS.includes(p as any) ? p : null);

      const rows = parsed.items.map((item) => ({
        campaignId: campaign.id,
        clientId: input.clientId,
        brainstormIdeaId: undefined,
        role: item.role?.slice(0, 100),
        platform: validPlatform(item.platform),
        conceptTitle: item.conceptTitle?.slice(0, 500),
        conceptDescription: item.conceptDescription,
        contentPillar: validPillar(item.contentPillar),
        plannedDate: new Date(start.getTime() + Math.max(0, Math.min(item.dayOffset ?? 0, campaign.durationDays - 1)) * 24 * 60 * 60 * 1000),
        status: "planned" as const,
      }));

      await createCampaignContentItems(rows);
      const updated = await updateCampaign(campaign.id, {
        thesis: typeof parsed.thesis === "string" ? parsed.thesis : undefined,
        offer: typeof parsed.offer === "string" ? parsed.offer : campaign.offer,
        status: "active",
      });

      // Mark used ideas as promoted and record the learning signal.
      for (const idea of likedIdeas) {
        await updateBrainstormIdea(idea.id, { status: "promoted", campaignId: campaign.id });
        await createPreferenceSignal({
          clientId: input.clientId,
          userId: ctx.user.id,
          signalType: "used_in_campaign",
          targetType: "brainstorm_idea",
          targetId: idea.id,
          direction: "positive",
          content: idea.hook ?? idea.title,
        });
      }

      const items = await getCampaignContentItems(campaign.id);
      return { ...updated, items };
    }),

  /**
   * Generate actual post drafts for one planned item — or every planned item
   * when no itemId is given. Posts land in the approval queue as drafts.
   */
  generateContentFromCampaign: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      campaignId: z.number(),
      itemId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await assertCampaignAccess(ctx, input.clientId, input.campaignId);
      const promptCtx = await loadPromptContext(input.clientId, { campaignId: campaign.id });

      const allItems = await getCampaignContentItems(campaign.id);
      const targets = input.itemId
        ? allItems.filter((i) => i.id === input.itemId)
        : allItems.filter((i) => i.status === "planned");
      if (targets.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No planned items to generate" });
      }

      const generated: number[] = [];
      const errors: string[] = [];

      for (const item of targets) {
        const platform = (item.platform ?? "linkedin_personal") as Platform;
        const pillar = (item.contentPillar ?? undefined) as ContentPillar | undefined;
        try {
          const { system, user } = buildPostPrompt(promptCtx, {
            platform,
            contentPillar: pillar,
            topic: [item.conceptTitle, item.conceptDescription].filter(Boolean).join(" — "),
          });

          const response = await trackedInvokeLLM(
            { messages: [{ role: "system", content: system }, { role: "user", content: user }] },
            { clientId: input.clientId, userId: ctx.user.id, taskType: "campaign_content", summary: `${campaign.name} / item ${item.id}` },
          );

          const content = response.choices[0]?.message?.content;
          if (!content) throw new Error("Empty model response");
          const parsed = JSON.parse(content) as { caption: string; hashtags: string; hook: string; scriptText?: string; subject?: string };

          let imageUrl: string | undefined;
          if (platform === "instagram" || platform === "facebook") {
            try {
              const img = buildImagePrompt(promptCtx, { caption: parsed.caption ?? parsed.hook ?? "", platform });
              const imgResult = await generateImage({ prompt: img.prompt, size: img.size });
              if (imgResult?.url) imageUrl = imgResult.url;
            } catch (imgErr) {
              console.error("[campaigns] Image generation failed (non-fatal):", imgErr);
            }
          }

          const post = await createContentPost({
            clientId: input.clientId,
            campaignId: campaign.id,
            title: parsed.subject?.substring(0, 100) ?? parsed.hook?.substring(0, 100),
            caption: parsed.caption,
            hashtags: parsed.hashtags,
            scriptText: parsed.scriptText,
            platform: platform as any,
            contentPillar: (pillar ?? null) as any,
            status: "pending_approval",
            scheduledAt: item.plannedDate ?? undefined,
            aiGenerated: true,
            generationPrompt: user,
            imageUrl,
            contentType: platform === "youtube" ? "video" : imageUrl ? "image" : "text",
          });

          if (post) {
            generated.push(post.id);
            await updateCampaignContentItem(item.id, { status: "generated", contentPostId: post.id });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[campaigns] Failed to generate item ${item.id}:`, msg);
          errors.push(`Item ${item.id}: ${msg}`);
        }
      }

      return { generated: generated.length, postIds: generated, errors };
    }),

  updateCampaign: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      campaignId: z.number(),
      name: z.string().optional(),
      status: z.enum(["draft", "generating", "active", "completed", "archived"]).optional(),
      thesis: z.string().optional(),
      offer: z.string().optional(),
      brief: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertCampaignAccess(ctx, input.clientId, input.campaignId);
      const { clientId, campaignId, ...data } = input;
      return updateCampaign(campaignId, data);
    }),
});
