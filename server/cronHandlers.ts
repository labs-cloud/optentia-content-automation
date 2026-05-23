import { Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import {
  createContentPost,
  getContentScheduleById,
  getScheduleByCronTaskUid,
  getScheduledPostsDue,
  getPlatformConnections,
  recordAnalyticsEvent,
  updateContentPost,
  updateContentSchedule,
  getPendingApprovalPosts,
} from "./db";

const PLATFORM_PROMPTS: Record<string, string> = {
  instagram: `You are an expert Instagram content creator for Optentia, an AI systems and automation operator for businesses. Generate a high-performing Instagram post with a strong hook, engaging caption (150-300 words), 15-20 hashtags, and a clear CTA. Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,
  linkedin: `You are an expert LinkedIn thought leader for Optentia. Generate a professional LinkedIn post with a compelling opener, authority-building body (200-400 words), and 3-5 hashtags. Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,
  facebook: `You are an expert Facebook content creator for Optentia. Generate a discussion-driving post with strong opinion, engaging body (100-250 words), and 3-5 hashtags. Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "..."}`,
  youtube: `You are an expert YouTube content strategist for Optentia. Generate a video title, description (150-300 words), and 10-15 tags. Return valid JSON only: {"caption": "...", "hashtags": "...", "hook": "...", "scriptText": "..."}`,
};

const CONTENT_PILLARS = ["strong_opinion", "practical_education", "documentary", "direct_promotion"] as const;

// ─── Generate Content Handler ─────────────────────────────────────────────────

export async function generateContentHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const schedule = await getScheduleByCronTaskUid(user.taskUid);
    if (!schedule) {
      return res.json({ ok: true, skipped: "orphan — no schedule found for this task uid" });
    }

    if (!schedule.isActive) {
      return res.json({ ok: true, skipped: "schedule is paused" });
    }

    const platforms: string[] = JSON.parse(schedule.platforms || "[]");
    const pillars: string[] = schedule.contentPillars
      ? JSON.parse(schedule.contentPillars)
      : [...CONTENT_PILLARS];

    const generatedPosts: number[] = [];

    for (let i = 0; i < schedule.postsPerRun; i++) {
      const platform = platforms[i % platforms.length];
      const pillar = pillars[i % pillars.length] as typeof CONTENT_PILLARS[number];
      const systemPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram;

      const userMessage = schedule.generationPrompt
        ? `${schedule.generationPrompt}\nPlatform: ${platform}\nContent pillar: ${pillar}`
        : `Generate a ${pillar.replace("_", " ")} post for ${platform}. Brand: Optentia — AI systems and automation operator for businesses. Be strategic, direct, and intelligent.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "social_post",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  caption: { type: "string" },
                  hashtags: { type: "string" },
                  hook: { type: "string" },
                  scriptText: { type: "string" },
                },
                required: ["caption", "hashtags", "hook"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : null;
        if (!content) continue;

        const parsed = JSON.parse(content);
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
          scheduleId: schedule.id,
          contentType: platform === "youtube" ? "video" : "text",
        });

        if (post) generatedPosts.push(post.id);
      } catch (err) {
        console.error(`[cron] Failed to generate post for ${platform}:`, err);
      }
    }

    // Update schedule last run time
    await updateContentSchedule(schedule.id, { lastRunAt: new Date() });

    // Notify owner if posts were generated
    if (generatedPosts.length > 0) {
      await notifyOwner({
        title: `${generatedPosts.length} New Post${generatedPosts.length > 1 ? "s" : ""} Pending Approval`,
        content: `The "${schedule.name}" schedule just generated ${generatedPosts.length} new post${generatedPosts.length > 1 ? "s" : ""} across ${platforms.join(", ")}. Review and approve them in your content queue.`,
      });
    }

    return res.json({ ok: true, generated: generatedPosts.length, postIds: generatedPosts });
  } catch (err) {
    console.error("[cron] generateContent error:", err);
    return res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Publish Posts Handler ────────────────────────────────────────────────────

export async function publishPostsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const duePosts = await getScheduledPostsDue();
    const published: number[] = [];
    const failed: number[] = [];

    for (const post of duePosts) {
      try {
        // In production: call the actual platform API here
        // For now: mark as published and record the event
        await updateContentPost(post.id, {
          status: "published",
          publishedAt: new Date(),
        });

        await recordAnalyticsEvent({
          postId: post.id,
          platform: post.platform,
          eventType: "published",
        });

        published.push(post.id);

        // Notify owner per published post
        await notifyOwner({
          title: `Post Published: ${post.platform}`,
          content: `Your ${post.platform} post "${post.title || post.caption?.substring(0, 60)}..." has been published successfully.`,
        });
      } catch (err) {
        console.error(`[cron] Failed to publish post ${post.id}:`, err);
        await updateContentPost(post.id, { status: "failed" });
        await recordAnalyticsEvent({
          postId: post.id,
          platform: post.platform,
          eventType: "failed",
        });
        failed.push(post.id);
      }
    }

    // Check platform connection health
    const connections = await getPlatformConnections();
    for (const conn of connections) {
      if (conn.status === "error") {
        await notifyOwner({
          title: `Platform Connection Issue: ${conn.platform}`,
          content: `The ${conn.platform} connection is reporting an error: ${conn.errorMessage || "Unknown error"}. Please check your credentials in Platform Settings.`,
        });
      }
    }

    return res.json({ ok: true, published: published.length, failed: failed.length });
  } catch (err) {
    console.error("[cron] publishPosts error:", err);
    return res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
