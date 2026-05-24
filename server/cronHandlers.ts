import { Request, Response } from "express";
import { parseExpression } from "cron-parser";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import {
  createContentPost,
  getActiveSchedulesDue,
  getScheduledPostsDue,
  getPlatformConnection,
  getPlatformConnections,
  recordAnalyticsEvent,
  updateContentPost,
  updateContentSchedule,
} from "./db";
import { publishToInstagram, publishToFacebook } from "./publishers/meta";
import { publishToLinkedIn } from "./publishers/linkedin";
import { publishYouTubeCommunityPost } from "./publishers/youtube";

function validateCronRequest(req: Request): boolean {
  if (!ENV.cronSecret) return false;
  return req.headers.authorization === `Bearer ${ENV.cronSecret}`;
}

function computeNextRunAt(cronExpr: string): Date {
  return parseExpression(cronExpr, { utc: true }).next().toDate();
}

// ─── Platform Prompts ─────────────────────────────────────────────────────────

const PLATFORM_PROMPTS: Record<string, string> = {
  instagram: `You are an expert Instagram content creator for Optentia — an AI systems and automation operator for businesses.

Will Hershey is the founder and face of this account. Audience: business owners who want to implement AI.

Write a high-performing Instagram post that:
- Opens with a bold, scroll-stopping hook (under 125 characters before "more")
- Delivers a sharp insight on AI systems, automation, or business operations (150-300 words)
- Uses direct, intelligent language — no hype, no buzzwords
- Closes with a specific CTA (e.g., "DM me 'SYSTEM'" or "Link in bio")
- Includes 15-20 targeted hashtags in the hashtags field

Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin: `You are a LinkedIn ghostwriter for Will Hershey, founder of Optentia — an AI systems and automation operator for businesses.

Write a personal LinkedIn post that:
- Opens with a single punchy line that makes people stop scrolling
- Shares a genuine perspective from operating an AI automation business (200-400 words)
- Writes in first person, conversational but authoritative
- Ends with a clear next step or question
- Includes 3-5 strategic hashtags

Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin_personal: `You are a LinkedIn ghostwriter for Will Hershey, founder of Optentia — an AI systems and automation operator for businesses.

Write a personal LinkedIn post that:
- Opens with a single punchy line that makes people stop scrolling
- Shares a genuine first-person perspective on AI, automation, or business building (200-400 words)
- Writes in first person — direct and confident, not corporate
- Ends with a clear insight or question to drive comments
- Includes 3-5 strategic hashtags

Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin_company: `You are a LinkedIn content strategist for Optentia, an AI systems and automation operator for businesses.

Write a company LinkedIn post that:
- Opens with a bold business insight or data point
- Establishes Optentia's authority in AI systems and automation (200-400 words)
- Uses confident, professional brand voice — not generic corporate speak
- Ends with a clear value proposition or CTA for business owners
- Includes 3-5 industry hashtags

Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  facebook: `You are a Facebook content creator for Optentia — an AI systems and automation operator for businesses.

Write a discussion-driving Facebook post that:
- Opens with a controversial or counterintuitive statement about AI or business
- Develops the idea with specific examples (100-250 words)
- Ends with a direct question that invites business owners to respond
- Includes 3-5 relevant hashtags

Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  youtube: `You are a YouTube content strategist for Optentia — an AI systems and automation operator for businesses.

Write a YouTube video package that:
- Creates a compelling, search-optimized title
- Writes a hook script for the first 30 seconds (what viewers will learn and why it matters now)
- Writes an optimized video description (150-300 words) covering the topic with a timestamp placeholder
- Includes 10-15 SEO-optimized tags

Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "...", "scriptText": "..."}`,
};

const CONTENT_PILLARS = [
  "strong_opinion",
  "practical_education",
  "documentary",
  "direct_promotion",
] as const;

// ─── Core Logic (no req/res — callable from any handler) ──────────────────────

async function runGenerateContent(): Promise<{
  schedulesRun: number;
  generated: number;
  postIds: number[];
}> {
  const dueSchedules = await getActiveSchedulesDue();
  const allPostIds: number[] = [];

  for (const schedule of dueSchedules) {
    const platforms: string[] = JSON.parse(schedule.platforms || "[]");
    const pillars: string[] = schedule.contentPillars
      ? JSON.parse(schedule.contentPillars)
      : [...CONTENT_PILLARS];

    const generatedPosts: number[] = [];

    for (let i = 0; i < schedule.postsPerRun; i++) {
      const platform = platforms[i % platforms.length];
      const pillar = pillars[i % pillars.length] as (typeof CONTENT_PILLARS)[number];
      const systemPrompt = PLATFORM_PROMPTS[platform] ?? PLATFORM_PROMPTS.instagram;

      const userMessage = schedule.generationPrompt
        ? `${schedule.generationPrompt}\nPlatform: ${platform}\nContent pillar: ${pillar.replace(/_/g, " ")}`
        : `Generate a ${pillar.replace(/_/g, " ")} post for ${platform}. Brand: Optentia — AI systems and automation operator for businesses. Will Hershey is the founder. Be strategic, direct, and intelligent.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });

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
            const imagePrompt = `Professional social media graphic for Optentia, a business AI automation company. Theme: "${parsed.hook?.substring(0, 80)}". Style: dark background with teal accent colors, minimalist, bold typography, no people or faces. Square 1:1 format.`;
            const imgResult = await generateImage({ prompt: imagePrompt });
            if (imgResult?.url) imageUrl = imgResult.url;
          } catch (imgErr) {
            console.error(`[cron] Image generation failed for ${platform} (non-fatal):`, imgErr);
          }
        }

        const post = await createContentPost({
          title: parsed.hook?.substring(0, 100),
          caption: parsed.caption,
          hashtags: parsed.hashtags,
          scriptText: parsed.scriptText,
          platform: platform as any,
          contentPillar: pillar,
          status: "pending_approval",
          aiGenerated: true,
          generationPrompt: userMessage,
          imageUrl,
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
    try {
      const result = await publishPostToPlatform(post);

      if (result.success) {
        await updateContentPost(post.id, {
          status: "published",
          publishedAt: new Date(),
          externalPostId: result.externalPostId,
          publishError: null,
        });
        await recordAnalyticsEvent({ postId: post.id, platform: post.platform, eventType: "published" });
        published.push(post.id);
        await notifyOwner({
          title: `Post Published: ${post.platform}`,
          content: `Your ${post.platform} post "${post.title || post.caption?.substring(0, 60)}..." has been published successfully.${result.externalPostId ? ` Post ID: ${result.externalPostId}` : ""}`,
        });
      } else {
        await updateContentPost(post.id, { status: "failed", publishError: result.error });
        await recordAnalyticsEvent({ postId: post.id, platform: post.platform, eventType: "failed" });
        failed.push(post.id);
        await notifyOwner({
          title: `Publish Failed: ${post.platform}`,
          content: `Failed to publish your ${post.platform} post "${post.title || post.caption?.substring(0, 60)}...". Error: ${result.error}`,
        });
      }
    } catch (err) {
      console.error(`[cron] Failed to publish post ${post.id}:`, err);
      await updateContentPost(post.id, { status: "failed", publishError: String(err) });
      await recordAnalyticsEvent({ postId: post.id, platform: post.platform, eventType: "failed" });
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

/** Single combined endpoint used by Vercel Cron (*/15 * * * *) */
export async function checkAndRunHandler(req: Request, res: Response) {
  if (!validateCronRequest(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
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
  platform: string;
  caption: string | null;
  hashtags: string | null;
  title: string | null;
  imageUrl: string | null;
  scriptText: string | null;
}): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
  const conn = await getPlatformConnection(post.platform);

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
      return publishToInstagram({
        accessToken: conn.accessToken,
        accountId: conn.accountId,
        caption: `${caption}\n\n${hashtags}`.trim(),
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
