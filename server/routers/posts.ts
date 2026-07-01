import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { trackedInvokeLLM } from "../_core/trackedLlm";
import { generateImage, type DalleSize } from "../_core/imageGeneration";
import { notifyOwner } from "../_core/notification";
import { assertClientAccess } from "../_core/clientScope";
import {
  createContentPost,
  createPreferenceSignal,
  deleteContentPost,
  getContentPostById,
  getContentPosts,
  getPendingApprovalPosts,
  recordAnalyticsEvent,
  updateContentPost,
} from "../db";
import {
  buildBrandBlock,
  buildImagePrompt,
  buildPostPrompt,
  extractHook,
  loadPromptContext,
  type PromptContext,
} from "../promptBuilder";
import { PLATFORMS, CONTENT_PILLARS, isManualPlatform, type Platform } from "@shared/platforms";
import { protectedProcedure, router } from "../_core/trpc";

const PLATFORM_ENUM = z.enum(PLATFORMS);
const PILLAR_ENUM = z.enum(CONTENT_PILLARS);
const REWORK_STRATEGY_ENUM = z.enum(["edit_existing", "fresh_angle", "photo_story", "practical_education", "stronger_cta", "contrarian"]);

type PlatformKey = z.infer<typeof PLATFORM_ENUM>;

async function safeGenerateForPlatform(
  ctx: PromptContext | null,
  caption: string,
  platform: PlatformKey,
): Promise<{ url?: string; error?: string }> {
  try {
    const { prompt, size } = buildImagePrompt(ctx, { caption, platform });
    const result = await generateImage({ prompt, size });
    if (!result.url) return { error: "Image generation returned no URL" };
    return { url: result.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function parseGeneratedPostJson(content: string): { caption: string; hashtags: string; hook: string; scriptText?: string; subject?: string } {
  try {
    const parsed = JSON.parse(content) as Partial<{ caption: string; hashtags: string; hook: string; scriptText: string; subject: string }>;
    if (!parsed.caption?.trim()) throw new Error("caption missing");
    return {
      caption: parsed.caption,
      hashtags: parsed.hashtags ?? "",
      hook: parsed.hook ?? parsed.subject ?? parsed.caption.slice(0, 100),
      scriptText: parsed.scriptText,
      subject: parsed.subject,
    };
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
  }
}

export const postsRouter = router({
  list: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      status: z.string().optional(),
      platform: z.string().optional(),
      campaignId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getContentPosts(input);
    }),

  pendingApproval: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      return getPendingApprovalPosts(input.clientId);
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
      clientId: z.number(),
      campaignId: z.number().optional(),
      title: z.string().optional(),
      caption: z.string(),
      hashtags: z.string().optional(),
      platform: PLATFORM_ENUM,
      contentType: z.enum(["text", "image", "video", "reel", "story", "carousel"]).default("text"),
      contentPillar: PILLAR_ENUM.optional(),
      scheduledAt: z.string().optional(),
      scriptText: z.string().optional(),
      mediaUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
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
      contentPillar: PILLAR_ENUM.optional(),
      contentType: z.enum(["text", "image", "video", "reel", "story", "carousel"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, scheduledAt, ...rest } = input;
      const existing = await getContentPostById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const post = await updateContentPost(id, {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });
      // An edit is a (weak) preference signal — the original needed changing.
      if (input.caption && existing.clientId && input.caption !== existing.caption) {
        await createPreferenceSignal({
          clientId: existing.clientId,
          userId: ctx.user.id,
          signalType: "edit",
          targetType: "content_post",
          targetId: id,
          direction: "negative",
          content: existing.caption,
          reason: "Caption was edited before approval",
        });
      }
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
    .mutation(async ({ ctx, input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      const updated = await updateContentPost(input.id, {
        status: input.scheduledAt ? "scheduled" : "approved",
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      });
      await recordAnalyticsEvent({
        postId: input.id,
        clientId: post.clientId,
        platform: post.platform,
        eventType: "approved",
      });
      if (post.clientId) {
        await createPreferenceSignal({
          clientId: post.clientId,
          userId: ctx.user.id,
          signalType: "post_approval",
          targetType: "content_post",
          targetId: post.id,
          direction: "positive",
          content: post.caption,
        });
      }
      return updated;
    }),

  reject: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      const updated = await updateContentPost(input.id, {
        status: "rejected",
        rejectionReason: input.reason,
      });
      await recordAnalyticsEvent({
        postId: input.id,
        clientId: post.clientId,
        platform: post.platform,
        eventType: "rejected",
      });
      if (post.clientId) {
        await createPreferenceSignal({
          clientId: post.clientId,
          userId: ctx.user.id,
          signalType: "post_rejection",
          targetType: "content_post",
          targetId: post.id,
          direction: "negative",
          content: post.caption,
          reason: input.reason,
        });
      }
      return updated;
    }),

  /** Flag a post as a proven winner — feeds the learning loop and "next batch from winners". */
  markWinner: protectedProcedure
    .input(z.object({ id: z.number(), isWinner: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      const updated = await updateContentPost(input.id, { isWinner: input.isWinner });
      if (input.isWinner && post.clientId) {
        await createPreferenceSignal({
          clientId: post.clientId,
          userId: ctx.user.id,
          signalType: "winner",
          targetType: "content_post",
          targetId: post.id,
          direction: "positive",
          content: post.caption,
        });
      }
      return updated;
    }),

  /**
   * Generate a fresh take on an existing post — optionally for a different platform
   * (e.g. turn a LinkedIn post into an email). The new post links back via parentPostId.
   */
  generateVariation: protectedProcedure
    .input(z.object({
      id: z.number(),
      targetPlatform: PLATFORM_ENUM.optional(),
      instructions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (!post.clientId) throw new TRPCError({ code: "BAD_REQUEST", message: "Post has no client assigned" });
      await assertClientAccess(ctx, post.clientId);
      const promptCtx = await loadPromptContext(post.clientId, { campaignId: post.campaignId });

      const platform = (input.targetPlatform ?? post.platform) as Platform;
      const { system, user } = buildPostPrompt(promptCtx, {
        platform,
        contentPillar: (post.contentPillar ?? undefined) as any,
        topic: undefined,
        extraInstructions: [
          `Create a fresh variation of this existing post. Keep the core idea, change the angle and wording:`,
          `"""${post.caption ?? post.title ?? ""}"""`,
          input.targetPlatform && input.targetPlatform !== post.platform
            ? `Adapt it fully to ${input.targetPlatform.replace(/_/g, " ")} conventions.`
            : "Do not repeat sentences from the original.",
          input.instructions ?? "",
        ].filter(Boolean).join("\n"),
      });

      const response = await trackedInvokeLLM(
        { messages: [{ role: "system", content: system }, { role: "user", content: user }] },
        { clientId: post.clientId, userId: ctx.user.id, taskType: "generate_variation", summary: `variation of post ${post.id} → ${platform}` },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
      const parsed = parseGeneratedPostJson(content);

      const created = await createContentPost({
        clientId: post.clientId,
        campaignId: post.campaignId,
        parentPostId: post.id,
        title: parsed.hook?.substring(0, 100),
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        scriptText: parsed.scriptText,
        platform,
        contentPillar: post.contentPillar,
        status: "draft",
        aiGenerated: true,
        generationPrompt: user,
        contentType: platform === "youtube" ? "video" : "text",
      });
      return created;
    }),

  regenerateCaption: protectedProcedure
    .input(z.object({
      id: z.number(),
      strategy: REWORK_STRATEGY_ENUM.default("fresh_angle"),
      instructions: z.string().optional(),
      avoidInstructions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await getContentPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (!post.clientId) throw new TRPCError({ code: "BAD_REQUEST", message: "Post has no client assigned" });
      await assertClientAccess(ctx, post.clientId);

      const promptCtx = await loadPromptContext(post.clientId, { campaignId: post.campaignId });
      const platform = post.platform as Platform;
      const strategyInstruction: Record<z.infer<typeof REWORK_STRATEGY_ENUM>, string> = {
        edit_existing: "Edit the existing copy directly. Preserve the same idea, argument, facts, order of reasoning, CTA intent, and legal disclaimers. Do not introduce a new angle. Make only the requested copy changes.",
        fresh_angle: "Find a new strategic angle for the same asset. The result should feel like a new post idea, not a sentence-level rewrite.",
        photo_story: "Use the attached image as the anchor. Infer a credible story, point of view, or professional context from the visual and write around that image.",
        practical_education: "Turn this into useful practical education. Make the post teach one clear thing the audience can act on.",
        stronger_cta: "Keep the core idea but make the path to action stronger, clearer, and more conversion-oriented without sounding pushy.",
        contrarian: "Create a sharper contrarian take. Make the opening bolder while staying accurate, professional, and compliant.",
      };
      const visualUrl =
        post.imageUrl && (post.contentType === "image" || post.contentType === "carousel")
          ? post.imageUrl
          : null;
      const { system, user } = buildPostPrompt(promptCtx, {
        platform,
        contentPillar: (post.contentPillar ?? undefined) as any,
        extraInstructions: [
          "Rework this existing post in place.",
          "Keep the same core idea, legal disclaimers, audience, platform, and CTA intent.",
          input.strategy === "edit_existing"
            ? "Do not change the post idea, factual claims, message path, or strategic angle unless the direct command explicitly says to."
            : "You may change the angle, structure, hook, and messaging path.",
          "Return a complete new title/hook, caption, and hashtags.",
          "Do not mention that this is regenerated or reworked.",
          strategyInstruction[input.strategy],
          visualUrl ? "Use the attached image as creative context. The copy should feel intentionally paired with the image." : null,
          "Existing title/hook:",
          `"""${post.title ?? ""}"""`,
          "Existing caption:",
          `"""${post.caption ?? ""}"""`,
          "Existing hashtags:",
          `"""${post.hashtags ?? ""}"""`,
          input.instructions ? `DIRECT COMMANDS — do exactly this:\n${input.instructions}` : null,
          input.avoidInstructions ? `DO NOT — hard negative constraints:\n${input.avoidInstructions}` : null,
        ].filter(Boolean).join("\n"),
      });

      const response = await trackedInvokeLLM(
        {
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: visualUrl
                ? [{ type: "text", text: user }, { type: "image_url", image_url: { url: visualUrl } }]
                : user,
            },
          ],
        },
        { clientId: post.clientId, userId: ctx.user.id, taskType: "rework_post", summary: `rework post ${post.id} / ${input.strategy}` },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
      const parsed = parseGeneratedPostJson(content);

      return updateContentPost(input.id, {
        title: (parsed.subject ?? parsed.hook)?.substring(0, 100),
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        scriptText: parsed.scriptText,
        generationPrompt: user,
        aiGenerated: true,
      });
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
      clientId: z.number(),
      campaignId: z.number().optional(),
      platform: PLATFORM_ENUM,
      contentPillar: PILLAR_ENUM.default("strong_opinion"),
      topic: z.string().optional(),
      tone: z.string().optional(),
      autoSubmitForApproval: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const promptCtx = await loadPromptContext(input.clientId, { campaignId: input.campaignId });
      const { system, user } = buildPostPrompt(promptCtx, {
        platform: input.platform,
        contentPillar: input.contentPillar,
        topic: input.topic,
        tone: input.tone,
      });

      const response = await trackedInvokeLLM(
        { messages: [{ role: "system", content: system }, { role: "user", content: user }] },
        { clientId: input.clientId, userId: ctx.user.id, taskType: "generate_post", summary: `${input.platform} / ${input.contentPillar}${input.topic ? ` / ${input.topic.slice(0, 60)}` : ""}` },
      );

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });

      let parsed: { caption: string; hashtags: string; hook: string; scriptText?: string; subject?: string };
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
      }

      let imageUrl: string | undefined;
      let imagePrompt: string | undefined;
      if (input.platform === "instagram" || input.platform === "facebook") {
        try {
          const img = buildImagePrompt(promptCtx, { caption: parsed.caption ?? parsed.hook ?? "", platform: input.platform });
          imagePrompt = img.prompt;
          const imgResult = await generateImage({ prompt: img.prompt, size: img.size });
          if (imgResult?.url) imageUrl = imgResult.url;
        } catch (imgErr) {
          console.error("[posts] Image generation failed (non-fatal):", imgErr);
        }
      }

      const post = await createContentPost({
        clientId: input.clientId,
        campaignId: input.campaignId,
        title: parsed.subject?.substring(0, 100) ?? parsed.hook?.substring(0, 100),
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        scriptText: parsed.scriptText,
        platform: input.platform,
        contentPillar: input.contentPillar,
        status: input.autoSubmitForApproval ? "pending_approval" : "draft",
        aiGenerated: true,
        generationPrompt: user,
        imageUrl,
        imagePrompt,
        contentType: input.platform === "youtube" ? "video" : (imageUrl ? "image" : "text"),
      });

      if (input.autoSubmitForApproval) {
        await notifyOwner({
          title: "New AI Content Pending Approval",
          content: `AI generated a new ${input.platform} post for ${promptCtx.client.name} ready for your review: "${parsed.hook?.substring(0, 80)}..."`,
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
        clientId: post.clientId,
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
      if (isManualPlatform(post.platform)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${post.platform} is a manual channel — copy the content and send it through your ${post.platform} tool.`,
        });
      }

      const { getPlatformConnection, getImageAssetsForPost } = await import("../db");
      const { publishToInstagram, publishCarouselToInstagram, publishToFacebook } = await import("../publishers/meta");
      const { publishToLinkedIn } = await import("../publishers/linkedin");
      const { publishYouTubeCommunityPost } = await import("../publishers/youtube");

      const conn = await getPlatformConnection(post.platform, post.clientId);
      if (!conn?.accessToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No credentials configured for ${post.platform}. Add them in Platform Settings.`,
        });
      }

      const caption = post.caption ?? "";
      const hashtags = post.hashtags ?? "";
      let result: { success: boolean; externalPostId?: string; externalPostUrl?: string; error?: string };

      switch (post.platform) {
        case "instagram": {
          const igCaption = `${caption}\n\n${hashtags}`.trim();
          // Carousel = the post's cover (imageUrl) + any linked image slides, in order.
          const slides = await getImageAssetsForPost(post.id);
          const carouselUrls = [post.imageUrl, ...slides.map((s) => s.url)].filter(
            (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i
          );
          if (post.contentType === "carousel" && carouselUrls.length >= 2) {
            result = await publishCarouselToInstagram({
              accessToken: conn.accessToken,
              accountId: conn.accountId ?? "",
              caption: igCaption,
              imageUrls: carouselUrls,
            });
          } else {
            result = await publishToInstagram({
              accessToken: conn.accessToken,
              accountId: conn.accountId ?? "",
              caption: igCaption,
              imageUrl: post.imageUrl ?? undefined,
            });
          }
          break;
        }
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
        await recordAnalyticsEvent({ postId: input.id, clientId: post.clientId, platform: post.platform, eventType: "failed" });
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
      await recordAnalyticsEvent({ postId: input.id, clientId: post.clientId, platform: post.platform, eventType: "published" });
      await notifyOwner({
        title: `✓ Post Published: ${post.platform}`,
        content: `Your ${post.platform} post "${post.title || caption.substring(0, 60)}..." was published successfully.`,
      });

      return { success: true, externalPostId: result.externalPostId, externalPostUrl: result.externalPostUrl };
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
      clientId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const platform: PlatformKey = input.platform ?? "instagram";
      let promptCtx: PromptContext | null = null;
      if (input.clientId) {
        await assertClientAccess(ctx, input.clientId);
        promptCtx = await loadPromptContext(input.clientId);
      }
      const result = await safeGenerateForPlatform(promptCtx, input.caption, platform);
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
      clientId: z.number(),
      caption: z.string().min(1),
      hashtags: z.string().optional(),
      imageUrl: z.string().optional(),
      platforms: z.array(PLATFORM_ENUM).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const promptCtx = await loadPromptContext(input.clientId);
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
            if (isManualPlatform(p)) {
              platformImages[p] = {};
              return;
            }
            platformImages[p] = await safeGenerateForPlatform(promptCtx, input.caption, p);
          }),
        );
      }

      const results: Array<{
        platform: string;
        success: boolean;
        postId?: number;
        externalPostId?: string;
        externalPostUrl?: string;
        imageUrl?: string;
        error?: string;
      }> = [];

      for (const platform of input.platforms) {
        let postId: number | undefined;
        const imgEntry = platformImages[platform];
        const imgUrl = imgEntry?.url;

        try {
          if (isManualPlatform(platform)) {
            // Manual channels: save the content as approved; the operator sends it themselves.
            const post = await createContentPost({
              clientId: input.clientId,
              caption: input.caption,
              hashtags: input.hashtags,
              platform,
              contentType: "text",
              status: "approved",
              aiGenerated: false,
            });
            results.push({
              platform,
              success: false,
              postId: post?.id,
              error: `${platform} is a manual channel — content saved to the queue for manual sending.`,
            });
            continue;
          }

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

          const conn = await getPlatformConnection(platform, input.clientId);
          if (!conn?.accessToken) {
            results.push({
              platform,
              success: false,
              error: `No credentials configured for ${platform}. Add them in Platform Settings.`,
            });
            continue;
          }

          const post = await createContentPost({
            clientId: input.clientId,
            caption: input.caption,
            hashtags: input.hashtags,
            platform,
            contentType: imgUrl ? "image" : "text",
            status: "approved",
            aiGenerated: !userOverride && Boolean(imgUrl),
            imageUrl: imgUrl,
            imagePrompt: !userOverride && imgUrl ? buildImagePrompt(promptCtx, { caption: input.caption, platform }).prompt : undefined,
          });
          postId = post.id;

          const caption = input.caption;
          const hashtags = input.hashtags ?? "";
          let publishResult: { success: boolean; externalPostId?: string; externalPostUrl?: string; error?: string };

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
            await recordAnalyticsEvent({ postId: post.id, clientId: input.clientId, platform, eventType: "failed" });
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
          await recordAnalyticsEvent({ postId: post.id, clientId: input.clientId, platform, eventType: "published" });
          results.push({
            platform,
            success: true,
            postId: post.id,
            imageUrl: imgUrl,
            externalPostId: publishResult.externalPostId,
            externalPostUrl: publishResult.externalPostUrl,
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
      clientId: z.number(),
      topic: z.string().min(1),
      platform: PLATFORM_ENUM.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const promptCtx = await loadPromptContext(input.clientId);
      const platform = input.platform ?? "instagram";
      const prompt = `${buildBrandBlock(promptCtx)}

Generate 3 distinct caption ideas for a ${platform.replace(/_/g, " ")} post about: "${input.topic}".

Each caption must have a DIFFERENT angle:
1. "Bold hook" — provocative one-line opener that stops scroll
2. "Practical teach" — concrete how-to / framework / numbered insight
3. "Story" — short personal narrative or client example

Return ONLY valid JSON in this exact shape (no preamble, no markdown fence):
{
  "ideas": [
    { "tone": "Bold hook", "caption": "...", "hashtags": "#tag1 #tag2 #tag3" },
    { "tone": "Practical teach", "caption": "...", "hashtags": "#tag1 #tag2 #tag3" },
    { "tone": "Story", "caption": "...", "hashtags": "#tag1 #tag2 #tag3" }
  ]
}`;
      const response = await trackedInvokeLLM(
        { messages: [{ role: "user", content: prompt }], maxTokens: 2000 },
        { clientId: input.clientId, userId: ctx.user.id, taskType: "caption_ideas", summary: input.topic.slice(0, 80) },
      );
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
      clientId: z.number().optional(),
      caption: z.string().min(1),
      platform: PLATFORM_ENUM.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hook = extractHook(input.caption);
      let brandStyle = "";
      if (input.clientId) {
        await assertClientAccess(ctx, input.clientId);
        const promptCtx = await loadPromptContext(input.clientId);
        const vs = promptCtx.brandProfile?.visualStyle?.trim();
        if (vs) brandStyle = `\nBrand visual style to respect: ${vs}`;
      }
      const prompt = `For this social media caption, design 3 DIFFERENT visual concepts that would each work as a stop-the-scroll graphic.

Caption: "${input.caption}"
Key hook (8-14 words): "${hook}"${brandStyle}

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
      const response = await trackedInvokeLLM(
        { messages: [{ role: "user", content: prompt }], maxTokens: 2500 },
        { clientId: input.clientId ?? null, userId: ctx.user.id, taskType: "visual_concepts", summary: hook.slice(0, 80) },
      );
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
      clientId: z.number(),
      caption: z.string().min(1),
      hashtags: z.string().optional(),
      imageUrl: z.string().optional(),
      platforms: z.array(PLATFORM_ENUM).min(1),
      pillar: PILLAR_ENUM.optional(),
      status: z.enum(["draft", "pending_approval"]).default("draft"),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx, input.clientId);
      const results: Array<{ platform: string; postId: number }> = [];
      for (const platform of input.platforms) {
        const post = await createContentPost({
          clientId: input.clientId,
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
