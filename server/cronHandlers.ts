import { Request, Response } from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { parseExpression } = require("cron-parser") as typeof import("cron-parser");
import { trackedInvokeLLM } from "./_core/trackedLlm";
import { generateImage } from "./_core/imageGeneration";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import {
  createContentPost,
  getActiveSchedulesDue,
  getScheduledPostsDue,
  getPlatformConnection,
  getPlatformConnections,
  getImageAssetsForPost,
  recordAnalyticsEvent,
  updateContentPost,
  updateContentSchedule,
} from "./db";
import {
  buildImagePrompt,
  buildPostPrompt,
  loadPromptContext,
  type PromptContext,
} from "./promptBuilder";
import { ensureMultiClientSchema } from "./ensureSchema";
import { runSeed } from "./seedCore";
import { CONTENT_PILLARS, isManualPlatform, type ContentPillar, type Platform } from "@shared/platforms";
import { publishToInstagram, publishCarouselToInstagram, publishToFacebook } from "./publishers/meta";
import { publishToLinkedIn } from "./publishers/linkedin";
import { publishYouTubeCommunityPost } from "./publishers/youtube";

function validateCronRequest(req: Request): boolean {
  if (!ENV.cronSecret) return false;
  const querySecret = typeof req.query?.secret === "string" ? req.query.secret : undefined;
  return (
    req.headers.authorization === `Bearer ${ENV.cronSecret}` ||
    querySecret === ENV.cronSecret
  );
}

let bootstrapped = false;

/**
 * Self-applying migration + seed: brings the DB up to the multi-client schema
 * and ensures the Optentia/demo clients exist (incl. legacy-row backfill).
 * Runs once per process; every statement is idempotent.
 */
async function ensureBootstrap(): Promise<{ applied: string[] } | null> {
  if (bootstrapped) return null;
  const { applied } = await ensureMultiClientSchema();
  await runSeed();
  bootstrapped = true;
  return { applied };
}

function computeNextRunAt(cronExpr: string): Date {
  return parseExpression(cronExpr, { utc: true }).next().toDate();
}

// ─── Core Logic (no req/res — callable from any handler) ──────────────────────

async function runGenerateContent(): Promise<{
  schedulesRun: number;
  generated: number;
  postIds: number[];
}> {
  const dueSchedules = await getActiveSchedulesDue();
  const allPostIds: number[] = [];

  for (const schedule of dueSchedules) {
    if (!schedule.clientId) {
      console.error(`[cron] Schedule ${schedule.id} ("${schedule.name}") has no clientId — skipping. Run \`pnpm seed\` to backfill legacy rows.`);
      continue;
    }

    let promptCtx: PromptContext;
    try {
      promptCtx = await loadPromptContext(schedule.clientId);
    } catch (err) {
      console.error(`[cron] Failed to load client context for schedule ${schedule.id}:`, err);
      continue;
    }

    const platforms: string[] = JSON.parse(schedule.platforms || "[]");
    const pillars: string[] = schedule.contentPillars
      ? JSON.parse(schedule.contentPillars)
      : [...CONTENT_PILLARS];

    const generatedPosts: number[] = [];

    for (let i = 0; i < schedule.postsPerRun; i++) {
      const platform = platforms[i % platforms.length] as Platform;
      const pillar = pillars[i % pillars.length] as ContentPillar;

      const { system, user } = buildPostPrompt(promptCtx, {
        platform,
        contentPillar: pillar,
        extraInstructions: schedule.generationPrompt ?? undefined,
      });

      try {
        const response = await trackedInvokeLLM(
          {
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          },
          { clientId: schedule.clientId, taskType: "scheduled_post", summary: `schedule "${schedule.name}" / ${platform} / ${pillar}` },
        );

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) continue;

        let parsed: { caption: string; hashtags: string; hook: string; scriptText?: string };
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          console.error(`[cron] Failed to parse AI response for ${platform}`);
          continue;
        }

        let imageUrl: string | undefined;
        if (platform === "instagram" || platform === "facebook") {
          try {
            const img = buildImagePrompt(promptCtx, { caption: parsed.caption ?? parsed.hook ?? "", platform });
            const imgResult = await generateImage({ prompt: img.prompt, size: img.size });
            if (imgResult?.url) imageUrl = imgResult.url;
          } catch (imgErr) {
            console.error(`[cron] Image generation failed for ${platform} (non-fatal):`, imgErr);
          }
        }

        const post = await createContentPost({
          clientId: schedule.clientId,
          title: parsed.hook?.substring(0, 100),
          caption: parsed.caption,
          hashtags: parsed.hashtags,
          scriptText: parsed.scriptText,
          platform: platform as any,
          contentPillar: pillar,
          status: "pending_approval",
          aiGenerated: true,
          generationPrompt: user,
          imageUrl,
          scheduleId: schedule.id,
          contentType: platform === "youtube" ? "video" : imageUrl ? "image" : "text",
        });

        if (post) generatedPosts.push(post.id);
      } catch (err) {
        console.error(`[cron] Failed to generate post for ${platform}:`, err);
      }
    }

    let nextRunAt: Date | undefined;
    try {
      nextRunAt = computeNextRunAt(schedule.cron);
    } catch {
      console.error(`[cron] Invalid cron expression for schedule ${schedule.id}: ${schedule.cron}`);
    }
    await updateContentSchedule(schedule.id, {
      lastRunAt: new Date(),
      ...(nextRunAt ? { nextRunAt } : {}),
    });

    if (generatedPosts.length > 0) {
      await notifyOwner({
        title: `${generatedPosts.length} New Post${generatedPosts.length > 1 ? "s" : ""} Pending Approval`,
        content: `The "${schedule.name}" schedule generated ${generatedPosts.length} new post${generatedPosts.length > 1 ? "s" : ""} across ${platforms.join(", ")}. Review and approve them in your content queue.`,
      });
      allPostIds.push(...generatedPosts);
    }
  }

  return { schedulesRun: dueSchedules.length, generated: allPostIds.length, postIds: allPostIds };
}

async function runPublishPosts(): Promise<{ published: number; failed: number }> {
  const duePosts = await getScheduledPostsDue();
  const published: number[] = [];
  const failed: number[] = [];

  for (const post of duePosts) {
    // Manual channels (email/WhatsApp) have no auto-publish path — leave them
    // scheduled; the operator sends them and marks them published in the queue.
    if (isManualPlatform(post.platform)) continue;

    try {
      const result = await publishPostToPlatform(post);

      if (result.success) {
        await updateContentPost(post.id, {
          status: "published",
          publishedAt: new Date(),
          externalPostId: result.externalPostId,
          publishError: null,
        });
        await recordAnalyticsEvent({ postId: post.id, clientId: post.clientId, platform: post.platform, eventType: "published" });
        published.push(post.id);
        await notifyOwner({
          title: `Post Published: ${post.platform}`,
          content: `Your ${post.platform} post "${post.title || post.caption?.substring(0, 60)}..." has been published successfully.${result.externalPostId ? ` Post ID: ${result.externalPostId}` : ""}`,
        });
      } else {
        await updateContentPost(post.id, { status: "failed", publishError: result.error });
        await recordAnalyticsEvent({ postId: post.id, clientId: post.clientId, platform: post.platform, eventType: "failed" });
        failed.push(post.id);
        await notifyOwner({
          title: `Publish Failed: ${post.platform}`,
          content: `Failed to publish your ${post.platform} post "${post.title || post.caption?.substring(0, 60)}...". Error: ${result.error}`,
        });
      }
    } catch (err) {
      console.error(`[cron] Failed to publish post ${post.id}:`, err);
      await updateContentPost(post.id, { status: "failed", publishError: String(err) });
      await recordAnalyticsEvent({ postId: post.id, clientId: post.clientId, platform: post.platform, eventType: "failed" });
      failed.push(post.id);
    }
  }

  // Alert on broken platform connections
  const connections = await getPlatformConnections();
  for (const conn of connections) {
    if (conn.status === "error") {
      await notifyOwner({
        title: `Platform Connection Issue: ${conn.platform}`,
        content: `The ${conn.platform} connection is reporting an error: ${conn.errorMessage || "Unknown error"}. Check your credentials in Platform Settings.`,
      });
    }
  }

  return { published: published.length, failed: failed.length };
}

// ─── HTTP Handlers ────────────────────────────────────────────────────────────

// Single combined endpoint used by Vercel Cron (every 15 minutes)
export async function checkAndRunHandler(req: Request, res: Response) {
  if (!validateCronRequest(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    await ensureBootstrap();
    const [genResult, pubResult] = await Promise.all([
      runGenerateContent(),
      runPublishPosts(),
    ]);
    return res.json({ ok: true, ...genResult, ...pubResult });
  } catch (err) {
    console.error("[cron] check-and-run error:", err);
    return res.status(500).json({ error: String(err), timestamp: new Date().toISOString() });
  }
}

/**
 * Manual migration trigger: GET/POST /api/scheduled/migrate?secret=CRON_SECRET
 * Idempotent — applies the multi-client schema and seeds Optentia + demo data.
 */
export async function migrateHandler(req: Request, res: Response) {
  if (!validateCronRequest(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const result = await ensureBootstrap();
    return res.json({
      ok: true,
      alreadyBootstrapped: result === null,
      applied: result?.applied ?? [],
    });
  } catch (err) {
    console.error("[cron] migrate error:", err);
    return res.status(500).json({ error: String(err), timestamp: new Date().toISOString() });
  }
}

/** Kept for local dev convenience */
export async function generateContentHandler(req: Request, res: Response) {
  if (!validateCronRequest(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const result = await runGenerateContent();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] generateContent error:", err);
    return res.status(500).json({ error: String(err), timestamp: new Date().toISOString() });
  }
}

/** Kept for local dev convenience */
export async function publishPostsHandler(req: Request, res: Response) {
  if (!validateCronRequest(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const result = await runPublishPosts();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] publishPosts error:", err);
    return res.status(500).json({ error: String(err), timestamp: new Date().toISOString() });
  }
}

// ─── Platform Dispatcher ──────────────────────────────────────────────────────

async function publishPostToPlatform(post: {
  id: number;
  clientId: number | null;
  platform: string;
  caption: string | null;
  hashtags: string | null;
  title: string | null;
  imageUrl: string | null;
  scriptText: string | null;
}): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
  const conn = await getPlatformConnection(post.platform, post.clientId);

  if (!conn?.accessToken) {
    return {
      success: false,
      error: `No credentials configured for ${post.platform}. Add them in Platform Settings.`,
    };
  }

  const caption = post.caption ?? "";
  const hashtags = post.hashtags ?? "";

  switch (post.platform) {
    case "instagram": {
      if (!conn.accountId) {
        return { success: false, error: "Instagram Business Account ID not configured." };
      }
      const igCaption = `${caption}\n\n${hashtags}`.trim();
      // Carousel = the post's cover (imageUrl) + any linked image slides, in order.
      const slides = await getImageAssetsForPost(post.id);
      const carouselUrls = [post.imageUrl, ...slides.map((s) => s.url)].filter(
        (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i
      );
      if (carouselUrls.length >= 2) {
        return publishCarouselToInstagram({
          accessToken: conn.accessToken,
          accountId: conn.accountId,
          caption: igCaption,
          imageUrls: carouselUrls,
        });
      }
      return publishToInstagram({
        accessToken: conn.accessToken,
        accountId: conn.accountId,
        caption: igCaption,
        imageUrl: post.imageUrl ?? undefined,
      });
    }

    case "facebook": {
      const pageId = conn.pageId ?? conn.accountId;
      if (!pageId) {
        return { success: false, error: "Facebook Page ID not configured." };
      }
      return publishToFacebook({
        accessToken: conn.accessToken,
        pageId,
        message: `${caption}\n\n${hashtags}`.trim(),
        imageUrl: post.imageUrl ?? undefined,
      });
    }

    case "linkedin":
    case "linkedin_personal":
    case "linkedin_company": {
      if (!conn.accountId) {
        return {
          success: false,
          error: `LinkedIn ${post.platform === "linkedin_company" ? "Organization" : "Person"} URN not configured.`,
        };
      }
      return publishToLinkedIn({
        accessToken: conn.accessToken,
        authorUrn: conn.accountId,
        text: caption,
        hashtags,
        imageUrl: post.imageUrl ?? undefined,
      });
    }

    case "youtube": {
      return publishYouTubeCommunityPost({
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken ?? undefined,
        text: post.title ? `${post.title}\n\n${caption}` : caption,
        hashtags,
        imageUrl: post.imageUrl ?? undefined,
      });
    }

    default:
      return { success: false, error: `Unknown platform: ${post.platform}` };
  }
}
