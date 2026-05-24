import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { notifyOwner } from "../_core/notification";
import {
  createContentPost,
  deleteContentPost,
  getContentPostById,
  getContentPosts,
  getPendingApprovalPosts,
  recordAnalyticsEvent,
  updateContentPost,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const PLATFORM_PROMPTS: Record<string, string> = {
  instagram: `You are an expert Instagram content creator for Optentia — an AI systems and automation operator for businesses.

Will Hershey is the founder and face of this account. Audience: business owners who want to implement AI.

Write a high-performing Instagram post that:
- Opens with a bold, scroll-stopping hook (under 125 characters before "more")
- Delivers a sharp insight on AI systems, automation, or business operations (150-300 words)
- Uses direct, intelligent language — no hype, no buzzwords
- Closes with a specific CTA (e.g., "DM me 'SYSTEM'" or "Link in bio")
- Includes 15-20 targeted hashtags in the hashtags field

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin: `You are a LinkedIn ghostwriter for Will Hershey, founder of Optentia — an AI systems and automation operator for businesses.

Write a personal LinkedIn post that:
- Opens with a single punchy line that makes people stop scrolling
- Shares a genuine perspective from operating an AI automation business (200-400 words)
- Writes in first person, conversational but authoritative
- Ends with a clear next step or question
- Includes 3-5 strategic hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin_personal: `You are a LinkedIn ghostwriter for Will Hershey, founder of Optentia — an AI systems and automation operator for businesses.

Write a personal LinkedIn post that:
- Opens with a single punchy line that makes people stop scrolling
- Shares a genuine first-person perspective on AI, automation, or business building (200-400 words)
- Writes in first person — direct and confident, not corporate
- Ends with a clear insight or question to drive comments
- Includes 3-5 strategic hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin_company: `You are a LinkedIn content strategist for Optentia, an AI systems and automation operator for businesses.

Write a company LinkedIn post that:
- Opens with a bold business insight or data point
- Establishes Optentia's authority in AI systems and automation (200-400 words)
- Uses confident, professional brand voice — not generic corporate speak
- Ends with a clear value proposition or CTA for business owners
- Includes 3-5 industry hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  facebook: `You are a Facebook content creator for Optentia — an AI systems and automation operator for businesses.

Write a discussion-driving Facebook post that:
- Opens with a controversial or counterintuitive statement about AI or business
- Develops the idea with specific examples (100-250 words)
- Ends with a direct question that invites business owners to respond
- Includes 3-5 relevant hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  youtube: `You are a YouTube content strategist for Optentia — an AI systems and automation operator for businesses.

Write a YouTube video package that:
- Creates a compelling, search-optimized title
- Writes a hook script for the first 30 seconds (what viewers will learn and why it matters now)
- Writes an optimized video description (150-300 words) covering the topic with a timestamp placeholder
- Includes 10-15 SEO-optimized tags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "...", "scriptText": "..."}`,
};

const CONTENT_PILLAR_CONTEXT: Record<string, string> = {
  strong_opinion: "Focus on a bold take about business inefficiency, AI misuse, or systems thinking. Be direct and opinionated.",
  practical_education: "Provide actionable, step-by-step automation or AI workflow education. Include a specific example.",
  documentary: "Share a behind-the-scenes look at daily workflows, desk setups, or business building process.",
  direct_promotion: "Highlight a case study, DM offer, consultation call, or product launch. Use before/after framing.",
};

export const postsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      platform: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      return getContentPosts(input);
    }),

  pendingApproval: protectedProcedure.query(async () => {
    return getPendingApprovalPosts();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      return post;
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      caption: z.string(),
      hashtags: z.string().optional(),
      platform: z.enum(["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]),
      contentType: z.enum(["text", "image", "video", "reel", "story", "carousel"]).default("text"),
      contentPillar: z.enum(["strong_opinion", "practical_education", "documentary", "direct_promotion"]).optional(),
      scheduledAt: z.string().optional(),
      scriptText: z.string().optional(),
      mediaUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const post = await createContentPost({
        ...input,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        status: "draft",
        aiGenerated: false,
      });
      return post;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      caption: z.string().optional(),
      hashtags: z.string().optional(),
      status: z.enum(["draft", "pending_approval", "approved", "scheduled", "published", "rejected", "failed"]).optional(),
      scheduledAt: z.string().optional(),
      scriptText: z.string().optional(),
      mediaUrl: z.string().optional(),
      contentPillar: z.enum(["strong_opinion", "practical_education", "documentary", "direct_promotion"]).optional(),
      contentType: z.enum(["text", "image", "video", "reel", "story", "carousel"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, scheduledAt, ...rest } = input;
      const post = await updateContentPost(id, {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });
      return post;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteContentPost(input.id);
      return { success: true };
    }),

  approve: protectedProcedure
    .input(z.object({
      id: z.number(),
      scheduledAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      const updated = await updateContentPost(input.id, {
        status: input.scheduledAt ? "scheduled" : "approved",
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      });
      await recordAnalyticsEvent({
        postId: input.id,
        platform: post.platform,
        eventType: "approved",
      });
      return updated;
    }),

  reject: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      const updated = await updateContentPost(input.id, {
        status: "rejected",
        rejectionReason: input.reason,
      });
      await recordAnalyticsEvent({
        postId: input.id,
        platform: post.platform,
        eventType: "rejected",
      });
      return updated;
    }),

  submitForApproval: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      const updated = await updateContentPost(input.id, { status: "pending_approval" });
      // Notify owner
      await notifyOwner({
        title: "Content Pending Approval",
        content: `A new ${post.platform} post is waiting for your review: "${post.title || post.caption?.substring(0, 60)}..."`,
      });
      return updated;
    }),

  generateAI: protectedProcedure
    .input(z.object({
      platform: z.enum(["instagram", "linkedin", "linkedin_personal", "linkedin_company", "facebook", "youtube"]),
      contentPillar: z.enum(["strong_opinion", "practical_education", "documentary", "direct_promotion"]).default("strong_opinion"),
      topic: z.string().optional(),
      tone: z.string().optional(),
      autoSubmitForApproval: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = PLATFORM_PROMPTS[input.platform] ?? PLATFORM_PROMPTS.linkedin;
      const pillarContext = CONTENT_PILLAR_CONTEXT[input.contentPillar];

      const userMessage = [
        pillarContext,
        input.topic ? `Topic/angle: ${input.topic}` : "Choose a compelling topic relevant to AI systems, business automation, or operational efficiency.",
        input.tone ? `Tone: ${input.tone}` : "Tone: Strategic, calm, intelligent, direct.",
        "Brand: Optentia — AI systems and automation operator for businesses. Not just an AI tool provider.",
        "Return only valid JSON, no markdown fences.",
      ].join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });

      let parsed: { caption: string; hashtags: string; hook: string; scriptText?: string };
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
      }

      // Generate an image for visual platforms (Instagram, Facebook)
      let imageUrl: string | undefined;
      let imagePrompt: string | undefined;
      if (input.platform === "instagram" || input.platform === "facebook") {
        try {
          imagePrompt = `Professional social media graphic for a business automation company called Optentia. Theme: "${parsed.hook?.substring(0, 80)}". Style: clean, modern, dark background with teal/cyan accent colors, minimalist design, bold typography, no people, no faces. Suitable for ${input.platform}. High quality, 1:1 square format.`;
          const imgResult = await generateImage({ prompt: imagePrompt });
          if (imgResult?.url) imageUrl = imgResult.url;
        } catch (imgErr) {
          console.error("[posts] Image generation failed (non-fatal):", imgErr);
        }
      }

      const post = await createContentPost({
        title: parsed.hook?.substring(0, 100),
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        scriptText: parsed.scriptText,
        platform: input.platform,
        contentPillar: input.contentPillar,
        status: input.autoSubmitForApproval ? "pending_approval" : "draft",
        aiGenerated: true,
        generationPrompt: userMessage,
        imageUrl,
        imagePrompt,
        contentType: input.platform === "youtube" ? "video" : (imageUrl ? "image" : "text"),
      });

      if (input.autoSubmitForApproval) {
        await notifyOwner({
          title: "New AI Content Pending Approval",
          content: `AI generated a new ${input.platform} post ready for your review: "${parsed.hook?.substring(0, 80)}..."`,
        });
      }

      return post;
    }),

  schedulePost: protectedProcedure
    .input(z.object({
      id: z.number(),
      scheduledAt: z.string(),
    }))
    .mutation(async ({ input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved posts can be scheduled" });
      }
      const updated = await updateContentPost(input.id, {
        status: "scheduled",
        scheduledAt: new Date(input.scheduledAt),
      });
      await recordAnalyticsEvent({
        postId: input.id,
        platform: post.platform,
        eventType: "scheduled",
      });
      return updated;
    }),

  publishNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.status !== "approved" && post.status !== "scheduled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved or scheduled posts can be published" });
      }

      const { getPlatformConnection } = await import("../db");
      const { publishToInstagram, publishToFacebook } = await import("../publishers/meta");
      const { publishToLinkedIn } = await import("../publishers/linkedin");
      const { publishYouTubeCommunityPost } = await import("../publishers/youtube");

      const conn = await getPlatformConnection(post.platform);
      if (!conn?.accessToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No credentials configured for ${post.platform}. Add them in Platform Settings.`,
        });
      }

      const caption = post.caption ?? "";
      const hashtags = post.hashtags ?? "";
      let result: { success: boolean; externalPostId?: string; error?: string };

      switch (post.platform) {
        case "instagram":
          result = await publishToInstagram({
            accessToken: conn.accessToken,
            accountId: conn.accountId ?? "",
            caption: `${caption}\n\n${hashtags}`.trim(),
            imageUrl: post.imageUrl ?? undefined,
          });
          break;
        case "facebook":
          result = await publishToFacebook({
            accessToken: conn.accessToken,
            pageId: conn.pageId ?? conn.accountId ?? "",
            message: `${caption}\n\n${hashtags}`.trim(),
            imageUrl: post.imageUrl ?? undefined,
          });
          break;
        case "linkedin":
        case "linkedin_personal":
        case "linkedin_company":
          result = await publishToLinkedIn({
            accessToken: conn.accessToken,
            authorUrn: conn.accountId ?? "",
            text: caption,
            hashtags,
            imageUrl: post.imageUrl ?? undefined,
          });
          break;
        case "youtube":
          result = await publishYouTubeCommunityPost({
            accessToken: conn.accessToken,
            refreshToken: conn.refreshToken ?? undefined,
            text: post.title ? `${post.title}\n\n${caption}` : caption,
            hashtags,
            imageUrl: post.imageUrl ?? undefined,
          });
          break;
        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown platform: ${post.platform}` });
      }

      if (!result.success) {
        await updateContentPost(input.id, { status: "failed", publishError: result.error });
        await recordAnalyticsEvent({ postId: input.id, platform: post.platform, eventType: "failed" });
        await notifyOwner({
          title: `⚠️ Publish Failed: ${post.platform}`,
          content: `Failed to publish post "${post.title || caption.substring(0, 60)}" to ${post.platform}. Error: ${result.error ?? "Unknown error"}`,
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "Publish failed" });
      }

      await updateContentPost(input.id, {
        status: "published",
        publishedAt: new Date(),
        externalPostId: result.externalPostId,
        publishError: null,
      });
      await recordAnalyticsEvent({ postId: input.id, platform: post.platform, eventType: "published" });
      await notifyOwner({
        title: `✓ Post Published: ${post.platform}`,
        content: `Your ${post.platform} post "${post.title || caption.substring(0, 60)}..." was published successfully.`,
      });

      return { success: true, externalPostId: result.externalPostId };
    }),
});
