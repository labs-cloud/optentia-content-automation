import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { generateImage, type DalleSize } from "../_core/imageGeneration";
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

type PlatformKey = z.infer<typeof PLATFORM_ENUM>;

/** DALL-E aspect ratio + visual brief per platform — tuned for stop-the-scroll graphics. */
const PLATFORM_IMAGE_BRIEF: Record<PlatformKey, { size: DalleSize; styleDesc: string }> = {
  instagram: {
    size: "1024x1024",
    styleDesc: "1:1 square sized for the Instagram feed.",
  },
  facebook: {
    size: "1792x1024",
    styleDesc: "1.91:1 landscape sized for the Facebook feed / link preview.",
  },
  linkedin: {
    size: "1792x1024",
    styleDesc: "1.91:1 landscape sized for the LinkedIn feed.",
  },
  linkedin_personal: {
    size: "1792x1024",
    styleDesc: "1.91:1 landscape sized for LinkedIn (personal feed). Looks like a Justin Welsh / Dan Koe quote-graphic.",
  },
  linkedin_company: {
    size: "1792x1024",
    styleDesc: "1.91:1 landscape sized for LinkedIn (company page). Professional but bold typographic poster.",
  },
  youtube: {
    size: "1024x1024",
    styleDesc: "1:1 square for the YouTube community tab.",
  },
};

/** Pull the punchiest 8–14 words out of the caption to use as the on-image hook. */
function extractHook(caption: string): string {
  const stripped = caption.replace(/\s+/g, " ").trim();
  const firstSentence = stripped.split(/(?<=[.!?])\s+/)[0] ?? stripped;
  if (firstSentence.length <= 90) return firstSentence;
  const words = firstSentence.split(" ");
  return words.slice(0, 12).join(" ");
}

function buildViralImagePrompt(caption: string, platform: PlatformKey): string {
  const hook = extractHook(caption);
  const brief = PLATFORM_IMAGE_BRIEF[platform];
  return [
    `Bold viral-style social media graphic for ${platform}. ${brief.styleDesc}`,
    `Render this short hook as the dominant visual element, large punchy typography, easy to read: "${hook}".`,
    `Style: high-contrast composition, ONE strong vibrant accent color (electric teal, hot pink, or vivid cyan), dark or gradient background, oversized text fills 50-70% of the frame.`,
    `Looks like a stop-the-scroll Justin Welsh / Dan Koe quote graphic. Minimal but bold. No people, no faces, no logos, no extra decoration.`,
    `Brand context: Optentia — AI systems and automation operator for businesses.`,
  ].join(" ");
}

async function safeGenerateForPlatform(
  caption: string,
  platform: PlatformKey,
): Promise<{ url?: string; error?: string }> {
  try {
    const prompt = buildViralImagePrompt(caption, platform);
    const { size } = PLATFORM_IMAGE_BRIEF[platform];
    const result = await generateImage({ prompt, size });
    if (!result.url) return { error: "Image generation returned no URL" };
    return { url: result.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

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

      let imageUrl: string | undefined;
      let imagePrompt: string | undefined;
      if (input.platform === "instagram" || input.platform === "facebook") {
        try {
          imagePrompt = buildViralImagePrompt(parsed.caption ?? parsed.hook ?? "", input.platform);
          const { size } = PLATFORM_IMAGE_BRIEF[input.platform];
          const imgResult = await generateImage({ prompt: imagePrompt, size });
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
      if (post.status !== "approved" && post.status !== "scheduled" && post.status !== "failed") {
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

  /** Upload a user-supplied image (base64) to R2 and return a /manus-storage URL. */
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

  /** AI-generate a hook-graphic for a given caption + platform. */
  generateImageForCaption: protectedProcedure
    .input(z.object({
      caption: z.string().min(1),
      platform: PLATFORM_ENUM.optional(),
    }))
    .mutation(async ({ input }) => {
      const platform: PlatformKey = input.platform ?? "instagram";
      const result = await safeGenerateForPlatform(input.caption, platform);
      if (result.error || !result.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Image generation failed",
        });
      }
      return { url: result.url, platform };
    }),

  /**
   * Instant post: caption → optional override image → fan out to N platforms.
   * When no `imageUrl` is provided, the server generates ONE platform-specific
   * graphic per selected platform in parallel before publishing.
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

      const userOverride = input.imageUrl?.trim() || null;
      const platformImages: Record<string, { url?: string; error?: string }> = {};

      if (userOverride) {
        for (const p of input.platforms) {
          platformImages[p] = { url: userOverride };
        }
      } else {
        await Promise.all(
          input.platforms.map(async (p) => {
            platformImages[p] = await safeGenerateForPlatform(input.caption, p);
          }),
        );
      }

      const results: Array<{
        platform: string;
        success: boolean;
        postId?: number;
        externalPostId?: string;
        imageUrl?: string;
        error?: string;
      }> = [];

      for (const platform of input.platforms) {
        let postId: number | undefined;
        const imgEntry = platformImages[platform];
        const imgUrl = imgEntry?.url;

        try {
          if (platform === "instagram" && !imgUrl) {
            results.push({
              platform,
              success: false,
              error:
                imgEntry?.error ??
                "Instagram requires an image but generation/upload didn't produce one.",
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
            contentType: imgUrl ? "image" : "text",
            status: "approved",
            aiGenerated: !userOverride && Boolean(imgUrl),
            imageUrl: imgUrl,
            imagePrompt: !userOverride && imgUrl ? buildViralImagePrompt(input.caption, platform) : undefined,
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
                imageUrl: imgUrl,
              });
              break;
            case "facebook":
              publishResult = await publishToFacebook({
                accessToken: conn.accessToken,
                pageId: conn.pageId ?? conn.accountId ?? "",
                message: `${caption}\n\n${hashtags}`.trim(),
                imageUrl: imgUrl,
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
                imageUrl: imgUrl,
              });
              break;
            case "youtube":
              publishResult = await publishYouTubeCommunityPost({
                accessToken: conn.accessToken,
                refreshToken: conn.refreshToken ?? undefined,
                text: caption,
                hashtags,
                imageUrl: imgUrl,
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
              imageUrl: imgUrl,
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
            imageUrl: imgUrl,
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
          results.push({ platform, success: false, postId, imageUrl: imgUrl, error: msg });
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
  // ─── 4-step wizard: topic → caption → visual concept → image → publish ─

  /** Step 1: Topic → 3 caption ideas in different tones. LLM-only, cheap. */
  generateCaptionIdeas: protectedProcedure
    .input(z.object({
      topic: z.string().min(1),
      platform: PLATFORM_ENUM.optional(),
    }))
    .mutation(async ({ input }) => {
      const platform = input.platform ?? "instagram";
      const platformBrief = PLATFORM_PROMPTS[platform] ?? PLATFORM_PROMPTS.instagram;
      const prompt = `Generate 3 distinct caption ideas for a social media post about: "${input.topic}".

Each caption must have a DIFFERENT angle:
1. "Bold hook" — provocative one-line opener that stops scroll
2. "Practical teach" — concrete how-to / framework / numbered insight
3. "Story" — short personal narrative or client example

Platform context:
${platformBrief}

Return ONLY valid JSON in this exact shape (no preamble, no markdown fence):
{
  "ideas": [
    { "tone": "Bold hook", "caption": "...", "hashtags": "#tag1 #tag2 #tag3" },
    { "tone": "Practical teach", "caption": "...", "hashtags": "#tag1 #tag2 #tag3" },
    { "tone": "Story", "caption": "...", "hashtags": "#tag1 #tag2 #tag3" }
  ]
}`;
      const response = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 2000,
      });
      const raw = response.choices[0]?.message?.content ?? "";
      const cleaned = raw.replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`\s*$/i, "").trim();
      let parsed: { ideas: Array<{ tone: string; caption: string; hashtags: string }> };
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned invalid JSON for caption ideas" });
      }
      return { ideas: parsed.ideas.map((idea, i) => ({ id: `c${i}`, ...idea })) };
    }),

  /** Step 2: Caption → 3 text-only visual concept descriptions. No image gen yet. */
  generateVisualConcepts: protectedProcedure
    .input(z.object({
      caption: z.string().min(1),
      platform: PLATFORM_ENUM.optional(),
    }))
    .mutation(async ({ input }) => {
      const hook = extractHook(input.caption);
      const prompt = `For this social media caption, design 3 DIFFERENT visual concepts that would each work as a stop-the-scroll graphic.

Caption: "${input.caption}"
Key hook (8-14 words): "${hook}"

Each concept must use a DIFFERENT visual style:
1. "Bold Typography" — high-contrast quote-graphic with the hook in large weight
2. "Editorial Illustration" — minimal flat illustration with a clear metaphor
3. "Documentary Photo" — composed photo (no text overlay) that evokes the message

For each concept return: styleName, description (1-2 sentences), colors (3 hex codes for background/primary/accent), imagePrompt (detailed AI-image-gen prompt at 1024x1024 — be specific about layout, typography weight, composition, mood).

Return ONLY valid JSON (no preamble, no markdown fence):
{
  "concepts": [
    { "styleName": "Bold Typography", "description": "...", "colors": ["#0D1B2A", "#FFFFFF", "#FF3D9A"], "imagePrompt": "..." },
    { "styleName": "Editorial Illustration", "description": "...", "colors": ["...", "...", "..."], "imagePrompt": "..." },
    { "styleName": "Documentary Photo", "description": "...", "colors": ["...", "...", "..."], "imagePrompt": "..." }
  ]
}`;
      const response = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 2500,
      });
      const raw = response.choices[0]?.message?.content ?? "";
      const cleaned = raw.replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`\s*$/i, "").trim();
      let parsed: { concepts: Array<{ styleName: string; description: string; colors: string[]; imagePrompt: string }> };
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned invalid JSON for visual concepts" });
      }
      return { concepts: parsed.concepts.map((c, i) => ({ id: `v${i}`, ...c })) };
    }),

  /** Step 3: Generate ONE image from a chosen concept's imagePrompt. Costs ~$0.04. */
  generateImageFromConcept: protectedProcedure
    .input(z.object({
      imagePrompt: z.string().min(1),
      size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await generateImage({ prompt: input.imagePrompt, size: (input.size ?? "1024x1024") as DalleSize });
        if (!result.url) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation returned no URL" });
        }
        return { url: result.url };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Image generation failed: ${msg}` });
      }
    }),

  /** Wizard finalizer: create N posts (one per platform) from chosen caption + image. */
  createFromWizard: protectedProcedure
    .input(z.object({
      caption: z.string().min(1),
      hashtags: z.string().optional(),
      imageUrl: z.string().optional(),
      platforms: z.array(PLATFORM_ENUM).min(1),
      pillar: z.enum(["strong_opinion", "practical_education", "documentary", "direct_promotion"]).optional(),
      status: z.enum(["draft", "pending_approval"]).default("draft"),
    }))
    .mutation(async ({ input }) => {
      const results: Array<{ platform: string; postId: number }> = [];
      for (const platform of input.platforms) {
        const post = await createContentPost({
          caption: input.caption,
          hashtags: input.hashtags,
          platform,
          contentType: input.imageUrl ? "image" : "text",
          contentPillar: input.pillar,
          mediaUrl: input.imageUrl,
          imageUrl: input.imageUrl,
          status: input.status,
          aiGenerated: true,
        });
        if (post) results.push({ platform, postId: post.id });
      }
      return { results };
    }),

});
