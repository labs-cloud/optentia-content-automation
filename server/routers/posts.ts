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

const PLATFORM_ENUM = z.enum([
  "instagram",
  "linkedin",
  "linkedin_personal",
  "linkedin_company",
  "facebook",
  "youtube",
]);

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
      platform: PLATFORM_ENUM,
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
      platform: PLATFORM_ENUM,
      contentPillar: z.enum(["strong_opinion", "practical_education", "documentary", "direct_promotion"]).default("strong_opinion"),
      topic: z.string().optional(),
      tone: z.string().optional(),
      autoSubmitForApproval: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const promptKey = (input.platform === "linkedin_personal" || input.platform === "linkedin_company") ? input.platform : input.platform;
      const systemPrompt = PLATFORM_PROMPTS[promptKey] ?? PLATFORM_PROMPTS["linkedin"];
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

  /**
   * Upload a user-supplied image (base64) to R2 storage and return a
   * `/manus-storage/...` URL that the publishers and Instant Post composer
   * can use as `imageUrl`.
   */
  uploadImage: protectedProcedure
    .input(z.object({
      dataBase64: z.string().min(1),
      mimeType: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const mt = input.mimeType.toLowerCase();
      const ext = mt.includes("png")
        ? "png"
        : mt.includes("jpeg") || mt.includes("jpg")
          ? "jpg"
          : mt.includes("gif")
            ? "gif"
            : mt.includes("webp")
              ? "webp"
              : "bin";
      const key = `uploads/${Date.now()}.${ext}`;
      const buffer = Buffer.from(input.dataBase64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  /**
   * AI-generate an image for the Instant Post composer. Uses the same DALL-E
   * pipeline as the AI Generator, but accepts an arbitrary prompt or a caption
   * to derive a prompt from.
   */
  generateImageForCaption: protectedProcedure
    .input(z.object({
      caption: z.string().min(1),
      platform: PLATFORM_ENUM.optional(),
    }))
    .mutation(async ({ input }) => {
      const promptPlatformLabel =
        input.platform === "linkedin" ||
        input.platform === "linkedin_personal" ||
        input.platform === "linkedin_company"
          ? "LinkedIn"
          : input.platform === "facebook"
            ? "Facebook"
            : input.platform === "youtube"
              ? "YouTube"
              : "Instagram";
      const prompt = `Professional social media graphic for Optentia, an AI systems and automation operator for businesses. Theme: "${input.caption.substring(0, 200)}". Style: clean, modern, dark background with teal/cyan accent colors, minimalist design, bold typography, no people, no faces. Suitable for ${promptPlatformLabel}. High quality, 1:1 square format.`;
      const result = await generateImage({ prompt });
      if (!result.url) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed" });
      }
      return { url: result.url, prompt };
    }),

  /**
   * Instant post: create + publish a free-form caption (with optional image)
   * to one or more platforms in a single request. No review queue, no
   * schedule. Returns a per-platform result so the UI can show which ones
   * landed.
   */
  quickPublish: protectedProcedure
    .input(z.object({
      caption: z.string().min(1),
      hashtags: z.string().optional(),
      imageUrl: z.string().optional(),
      platforms: z.array(PLATFORM_ENUM).min(1),
    }))
    .mutation(async ({ input }) => {
      const { getPlatformConnection } = await import("../db");
      const { publishToInstagram, publishToFacebook } = await import("../publishers/meta");
      const { publishToLinkedIn } = await import("../publishers/linkedin");
      const { publishYouTubeCommunityPost } = await import("../publishers/youtube");

      const results: Array<{
        platform: string;
        success: boolean;
        postId?: number;
        externalPostId?: string;
        error?: string;
      }> = [];

      const hasImage = Boolean(input.imageUrl && input.imageUrl.length > 0);

      for (const platform of input.platforms) {
        let postId: number | undefined;
        try {
          // Instagram strictly requires media — fail fast with a clear message
          // so the dialog renders the right error before we even touch the API.
          if (platform === "instagram" && !hasImage) {
            results.push({
              platform,
              success: false,
              error: "Instagram requires an image. Attach or generate one before publishing.",
            });
            continue;
          }

          const conn = await getPlatformConnection(platform);
          if (!conn?.accessToken) {
            results.push({
              platform,
              success: false,
              error: `No credentials configured for ${platform}. Add them in Platform Settings.`,
            });
            continue;
          }

          const post = await createContentPost({
            caption: input.caption,
            hashtags: input.hashtags,
            platform,
            contentType: hasImage ? "image" : "text",
            status: "approved",
            aiGenerated: false,
            imageUrl: input.imageUrl,
          });
          postId = post.id;

          const caption = input.caption;
          const hashtags = input.hashtags ?? "";
          let publishResult: { success: boolean; externalPostId?: string; error?: string };

          switch (platform) {
            case "instagram":
              publishResult = await publishToInstagram({
                accessToken: conn.accessToken,
                accountId: conn.accountId ?? "",
                caption: `${caption}\n\n${hashtags}`.trim(),
                imageUrl: input.imageUrl,
              });
              break;
            case "facebook":
              publishResult = await publishToFacebook({
                accessToken: conn.accessToken,
                pageId: conn.pageId ?? conn.accountId ?? "",
                message: `${caption}\n\n${hashtags}`.trim(),
                imageUrl: input.imageUrl,
              });
              break;
            case "linkedin":
            case "linkedin_personal":
            case "linkedin_company":
              publishResult = await publishToLinkedIn({
                accessToken: conn.accessToken,
                authorUrn: conn.accountId ?? "",
                text: caption,
                hashtags,
                imageUrl: input.imageUrl,
              });
              break;
            case "youtube":
              publishResult = await publishYouTubeCommunityPost({
                accessToken: conn.accessToken,
                refreshToken: conn.refreshToken ?? undefined,
                text: caption,
                hashtags,
                imageUrl: input.imageUrl,
              });
              break;
            default:
              publishResult = { success: false, error: `Unknown platform: ${platform}` };
          }

          if (!publishResult.success) {
            await updateContentPost(post.id, {
              status: "failed",
              publishError: publishResult.error,
            });
            await recordAnalyticsEvent({ postId: post.id, platform, eventType: "failed" });
            results.push({
              platform,
              success: false,
              postId: post.id,
              error: publishResult.error,
            });
            continue;
          }

          await updateContentPost(post.id, {
            status: "published",
            publishedAt: new Date(),
            externalPostId: publishResult.externalPostId,
            publishError: null,
          });
          await recordAnalyticsEvent({ postId: post.id, platform, eventType: "published" });
          results.push({
            platform,
            success: true,
            postId: post.id,
            externalPostId: publishResult.externalPostId,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (postId !== undefined) {
            try {
              await updateContentPost(postId, { status: "failed", publishError: msg });
            } catch {
              // best-effort cleanup
            }
          }
          results.push({ platform, success: false, postId, error: msg });
        }
      }

      const anySuccess = results.some((r) => r.success);
      const anyFailure = results.some((r) => !r.success);
      if (anySuccess || anyFailure) {
        await notifyOwner({
          title: anyFailure
            ? `⚠️ Instant post: ${results.filter((r) => r.success).length}/${results.length} succeeded`
            : `✓ Instant post: published to ${results.length} platform${results.length === 1 ? "" : "s"}`,
          content: results
            .map((r) =>
              r.success
                ? `${r.platform}: published${r.externalPostId ? ` (${r.externalPostId})` : ""}`
                : `${r.platform}: failed — ${r.error ?? "unknown error"}`,
            )
            .join("\n"),
        });
      }

      return results;
    }),
});
