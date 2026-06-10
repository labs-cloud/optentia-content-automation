import type {
  Campaign,
  Client,
  ClientBrandProfile,
  PreferenceSignal,
} from "../drizzle/schema";
import type { DalleSize } from "./_core/imageGeneration";
import {
  getBrandProfileByClientId,
  getCampaignById,
  getClientById,
  getPreferenceSignals,
} from "./db";
import { CONTENT_PILLARS, type ContentPillar, type Platform } from "@shared/platforms";

// ─── Prompt Context ───────────────────────────────────────────────────────────

export type PromptContext = {
  client: Client;
  brandProfile?: ClientBrandProfile | null;
  campaign?: Campaign | null;
  signals?: PreferenceSignal[];
  approvedExamples?: string[];
  rejectedExamples?: string[];
};

/** Loads everything generation needs to know about a client in one call. */
export async function loadPromptContext(
  clientId: number,
  opts?: { campaignId?: number | null },
): Promise<PromptContext> {
  const client = await getClientById(clientId);
  if (!client) throw new Error(`Client ${clientId} not found`);
  const [brandProfile, signals, campaign] = await Promise.all([
    getBrandProfileByClientId(clientId),
    getPreferenceSignals(clientId, { limit: 20 }),
    opts?.campaignId ? getCampaignById(opts.campaignId) : Promise.resolve(null),
  ]);
  const parseExamples = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 5) : [];
  return {
    client,
    brandProfile: brandProfile ?? null,
    campaign: campaign ?? null,
    signals,
    approvedExamples: parseExamples(brandProfile?.approvedExamples),
    rejectedExamples: parseExamples(brandProfile?.rejectedExamples),
  };
}

// ─── Platform Guidelines (brand-agnostic structure rules) ─────────────────────

/**
 * Structural rules per platform. Brand identity is injected separately from the
 * client's Brand Operating Profile — nothing brand-specific belongs here.
 */
const PLATFORM_GUIDELINES: Record<Platform, string> = {
  instagram: `Write a high-performing Instagram post that:
- Opens with a bold, scroll-stopping hook (under 125 characters before "more")
- Delivers a sharp, specific insight for the brand's audience (150-300 words)
- Uses direct, intelligent language — no hype, no buzzwords
- Closes with a specific CTA in the brand's CTA style
- Includes 15-20 targeted hashtags in the hashtags field

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin: `Write a personal LinkedIn post that:
- Opens with a single punchy line that makes people stop scrolling
- Shares a genuine perspective relevant to the brand's audience (200-400 words)
- Writes in first person, conversational but authoritative
- Ends with a clear next step or question
- Includes 3-5 strategic hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin_personal: `Write a personal LinkedIn post (founder's voice) that:
- Opens with a single punchy line that makes people stop scrolling
- Shares a genuine first-person perspective tied to the brand's expertise (200-400 words)
- Writes in first person — direct and confident, not corporate
- Ends with a clear insight or question to drive comments
- Includes 3-5 strategic hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  linkedin_company: `Write a company LinkedIn post that:
- Opens with a bold business insight or data point
- Establishes the brand's authority in its industry (200-400 words)
- Uses a confident, professional brand voice — not generic corporate speak
- Ends with a clear value proposition or CTA for the brand's audience
- Includes 3-5 industry hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  facebook: `Write a discussion-driving Facebook post that:
- Opens with a controversial or counterintuitive statement relevant to the brand's space
- Develops the idea with specific examples (100-250 words)
- Ends with a direct question that invites the brand's audience to respond
- Includes 3-5 relevant hashtags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "..."}`,

  youtube: `Write a YouTube video package that:
- Creates a compelling, search-optimized title
- Writes a hook script for the first 30 seconds (what viewers will learn and why it matters now)
- Writes an optimized video description (150-300 words) covering the topic with a timestamp placeholder
- Includes 10-15 SEO-optimized tags

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "...", "hook": "...", "scriptText": "..."}`,

  email: `Write a marketing email that:
- Has a curiosity-driven subject line (under 50 characters) in the "subject" field
- Opens with a one-line hook that earns the next sentence
- Delivers one clear idea or offer for the brand's audience (120-250 words, short paragraphs)
- Closes with ONE specific CTA in the brand's CTA style
- Leaves the hashtags field as an empty string

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "", "hook": "...", "subject": "..."}`,

  whatsapp: `Write a WhatsApp broadcast message that:
- Reads like a personal note, not an ad (40-120 words)
- Opens with a direct, relevant hook for the brand's audience
- Includes ONE clear CTA (reply keyword or link) in the brand's CTA style
- Uses no hashtags — leave the hashtags field as an empty string
- Uses at most one emoji

Return only valid JSON, no markdown fences: {"caption": "...", "hashtags": "", "hook": "..."}`,
};

export const CONTENT_PILLAR_CONTEXT: Record<ContentPillar, string> = {
  strong_opinion: "Focus on a bold take about inefficiency, common mistakes, or contrarian thinking in the brand's industry. Be direct and opinionated.",
  practical_education: "Provide actionable, step-by-step education relevant to the brand's offer. Include a specific example.",
  documentary: "Share a behind-the-scenes look at the brand's daily work, process, or journey.",
  direct_promotion: "Highlight a case study, offer, consultation, or product. Use before/after framing.",
};

// ─── Brand Block ──────────────────────────────────────────────────────────────

function section(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? `${label}: ${trimmed}` : null;
}

/** Renders the client + brand profile + campaign into prompt-ready context. */
export function buildBrandBlock(ctx: PromptContext): string {
  const { client, brandProfile, campaign } = ctx;
  const lines: Array<string | null> = [
    `BRAND PROFILE — write strictly as this brand:`,
    section("Brand", client.name),
    section("What they do", client.description),
    section("Industry", client.industry),
    section("Website", client.websiteUrl),
    section("Primary offer", brandProfile?.offers ?? client.primaryOffer),
    section("Audience", brandProfile?.audience ?? client.audience),
    section("Voice", brandProfile?.voice),
    section("Tone", brandProfile?.tone),
    section("Buyer pains to speak to", brandProfile?.buyerPains),
    section("Proof points to draw on", brandProfile?.proofPoints),
    section("Visual style", brandProfile?.visualStyle),
    section("CTA style", brandProfile?.ctaStyle),
    section("Brand summary", brandProfile?.brandSummary),
  ];

  if (brandProfile?.forbiddenPhrases?.trim()) {
    lines.push(`HARD CONSTRAINT — never use these phrases or anything close to them: ${brandProfile.forbiddenPhrases.trim()}`);
  }

  if (campaign) {
    lines.push(
      "",
      "ACTIVE CAMPAIGN — this content belongs to a campaign:",
      section("Campaign", campaign.name),
      section("Goal", campaign.goal?.replace(/_/g, " ")),
      section("Thesis", campaign.thesis),
      section("Offer", campaign.offer),
    );
  }

  const approved = ctx.approvedExamples ?? [];
  if (approved.length > 0) {
    lines.push("", "STYLE ANCHORS — content the brand approved; match this style:");
    approved.slice(0, 3).forEach((ex, i) => lines.push(`${i + 1}. ${ex}`));
  }

  const rejected = ctx.rejectedExamples ?? [];
  const negativeSignals = (ctx.signals ?? [])
    .filter((s) => s.direction === "negative" && s.content)
    .slice(0, 3)
    .map((s) => s.content as string);
  const avoid = [...rejected.slice(0, 3), ...negativeSignals];
  if (avoid.length > 0) {
    lines.push("", "AVOID — the brand rejected content like this; do not produce anything similar:");
    avoid.slice(0, 4).forEach((ex, i) => lines.push(`${i + 1}. ${ex}`));
  }

  const positiveSignals = (ctx.signals ?? [])
    .filter((s) => s.direction === "positive" && s.content)
    .slice(0, 3)
    .map((s) => s.content as string);
  if (positiveSignals.length > 0) {
    lines.push("", "RECENTLY LIKED — the brand responded well to ideas like these:");
    positiveSignals.forEach((ex, i) => lines.push(`${i + 1}. ${ex}`));
  }

  return lines.filter((l): l is string => l !== null).join("\n");
}

// ─── Post Generation ──────────────────────────────────────────────────────────

export type PostPromptOptions = {
  platform: Platform;
  contentPillar?: ContentPillar;
  topic?: string;
  tone?: string;
  /** Free-form extra instructions, e.g. a schedule's custom generationPrompt. */
  extraInstructions?: string;
};

export function buildPostPrompt(
  ctx: PromptContext,
  opts: PostPromptOptions,
): { system: string; user: string } {
  const guideline = PLATFORM_GUIDELINES[opts.platform] ?? PLATFORM_GUIDELINES.linkedin;
  const system = [
    `You are an expert ${opts.platform.replace(/_/g, " ")} content creator working for the brand described below.`,
    "",
    buildBrandBlock(ctx),
    "",
    guideline,
  ].join("\n");

  const userParts = [
    opts.contentPillar ? CONTENT_PILLAR_CONTEXT[opts.contentPillar] : null,
    opts.topic
      ? `Topic/angle: ${opts.topic}`
      : "Choose a compelling topic the brand's audience cares about right now, grounded in the brand profile above.",
    opts.tone ? `Tone: ${opts.tone}` : null,
    opts.extraInstructions ?? null,
    "Return only valid JSON, no markdown fences.",
  ];
  return { system, user: userParts.filter((p): p is string => p !== null).join("\n") };
}

// ─── Image Generation ─────────────────────────────────────────────────────────

/** DALL-E aspect ratio + visual brief per platform — tuned for stop-the-scroll graphics. */
export const PLATFORM_IMAGE_BRIEF: Record<Platform, { size: DalleSize; styleDesc: string }> = {
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
  email: {
    size: "1792x1024",
    styleDesc: "1.91:1 landscape email header banner.",
  },
  whatsapp: {
    size: "1024x1024",
    styleDesc: "1:1 square image suitable for a WhatsApp broadcast.",
  },
};

/** Pull the punchiest 8–14 words out of the caption to use as the on-image hook. */
export function extractHook(caption: string): string {
  const stripped = caption.replace(/\s+/g, " ").trim();
  const firstSentence = stripped.split(/(?<=[.!?])\s+/)[0] ?? stripped;
  if (firstSentence.length <= 90) return firstSentence;
  const words = firstSentence.split(" ");
  return words.slice(0, 12).join(" ");
}

export function buildImagePrompt(
  ctx: PromptContext | null,
  opts: { caption: string; platform: Platform },
): { prompt: string; size: DalleSize } {
  const hook = extractHook(opts.caption);
  const brief = PLATFORM_IMAGE_BRIEF[opts.platform];
  const visualStyle = ctx?.brandProfile?.visualStyle?.trim();
  const brandLine = ctx
    ? `Brand context: ${ctx.client.name}${ctx.client.description ? ` — ${ctx.client.description}` : ""}.`
    : "";
  const prompt = [
    `Bold viral-style social media graphic for ${opts.platform}. ${brief.styleDesc}`,
    `Render this short hook as the dominant visual element, large punchy typography, easy to read: "${hook}".`,
    visualStyle
      ? `Style: ${visualStyle}`
      : `Style: high-contrast composition, ONE strong vibrant accent color (electric teal, hot pink, or vivid cyan), dark or gradient background, oversized text fills 50-70% of the frame.`,
    `Looks like a stop-the-scroll quote graphic. Minimal but bold. No people, no faces, no logos, no extra decoration.`,
    brandLine,
  ].filter(Boolean).join(" ");
  return { prompt, size: brief.size };
}

// ─── Brainstorm Ideas ─────────────────────────────────────────────────────────

export function buildBrainstormPrompt(
  ctx: PromptContext,
  opts: { count: number; theme?: string },
): { system: string; user: string } {
  const system = [
    "You are a senior creative strategist generating content ideas for the brand described below.",
    "",
    buildBrandBlock(ctx),
    "",
    `Generate exactly ${opts.count} distinct, specific content ideas. Mix the idea types across:
post_hook, campaign_angle, reel_idea, carousel_idea, email_angle, whatsapp_message, ad_concept, visual_concept, offer_angle.

Each idea must be concrete enough to act on — no generic filler like "share tips".
Vary the content pillars across: ${CONTENT_PILLARS.join(", ")}.

Return only valid JSON, no markdown fences:
{"ideas": [{"type": "post_hook", "title": "...", "hook": "...", "description": "...", "platform": "instagram", "contentPillar": "strong_opinion", "visualConcept": "...", "cta": "..."}]}

Allowed platform values: instagram, linkedin, linkedin_personal, linkedin_company, facebook, youtube, email, whatsapp.`,
  ].join("\n");

  const user = [
    opts.theme ? `Theme to explore: ${opts.theme}` : "Cover a healthy spread of angles across the brand's offers and audience pains.",
    `Generate ${opts.count} ideas now. Return only valid JSON.`,
  ].join("\n");

  return { system, user };
}

// ─── Brand Operating Profile Generation ───────────────────────────────────────

export function buildBrandProfilePrompt(
  client: Client,
  opts?: { sourceText?: string; existingProfile?: ClientBrandProfile | null },
): { system: string; user: string } {
  const system = `You are a senior brand strategist. Build a Brand Operating Profile — the single source of truth an AI content engine will use to write in this brand's voice.

Return only valid JSON, no markdown fences, with exactly these string fields:
{"voice": "...", "tone": "...", "audience": "...", "buyerPains": "...", "offers": "...", "proofPoints": "...", "competitors": "...", "visualStyle": "...", "ctaStyle": "...", "forbiddenPhrases": "...", "brandSummary": "..."}

Rules:
- Each field is a concise, information-dense paragraph or comma-separated list (no nested JSON).
- "voice" = how the brand sounds (perspective, energy, vocabulary). "tone" = emotional register.
- "buyerPains" = the audience's most pressing problems, specific to this industry.
- "proofPoints" = credibility elements (results, experience, differentiators) — infer conservatively, never invent specific numbers.
- "visualStyle" = direction for generated graphics (colors, mood, typography).
- "ctaStyle" = how this brand should ask for action.
- "forbiddenPhrases" = clichés and hype words this brand must avoid.
- "brandSummary" = 2-3 sentences a ghostwriter could read to instantly get the brand.`;

  const lines = [
    "Build the Brand Operating Profile from this client information:",
    section("Name", client.name),
    section("Website", client.websiteUrl),
    section("Industry", client.industry),
    section("Description", client.description),
    section("Primary offer", client.primaryOffer),
    section("Audience", client.audience),
  ].filter((l): l is string => l !== null);

  if (opts?.existingProfile) {
    lines.push(
      "",
      "An earlier profile exists — improve and sharpen it rather than starting from scratch:",
      JSON.stringify({
        voice: opts.existingProfile.voice,
        tone: opts.existingProfile.tone,
        audience: opts.existingProfile.audience,
        offers: opts.existingProfile.offers,
      }),
    );
  }
  if (opts?.sourceText?.trim()) {
    lines.push("", "Additional source material (website copy, about text, examples):", opts.sourceText.trim().slice(0, 6000));
  }
  lines.push("", "Return only valid JSON.");

  return { system, user: lines.join("\n") };
}

// ─── Campaign Plan Generation ─────────────────────────────────────────────────

export function buildCampaignPlanPrompt(
  ctx: PromptContext,
  opts: {
    name: string;
    goal: string;
    durationDays: number;
    platforms: string[];
    brief?: string;
    likedIdeas?: Array<{ title?: string | null; hook?: string | null; description?: string | null }>;
  },
): { system: string; user: string } {
  const postCount = Math.min(Math.max(Math.round(opts.durationDays * 0.8), 6), 24);
  const system = [
    "You are a senior marketing campaign strategist planning a content campaign for the brand described below.",
    "",
    buildBrandBlock(ctx),
    "",
    `Design a ${opts.durationDays}-day campaign. Return only valid JSON, no markdown fences:
{
  "thesis": "2-4 sentence campaign thesis — the single argument this campaign makes",
  "offer": "what the campaign drives toward",
  "items": [
    {"conceptTitle": "...", "conceptDescription": "1-2 sentences of what this piece says", "platform": "instagram", "contentPillar": "strong_opinion", "dayOffset": 0, "role": "anchor"}
  ]
}

Rules:
- Produce exactly ${postCount} items spread across days 0 to ${opts.durationDays - 1} (dayOffset = integer day from campaign start).
- Only use these platforms: ${opts.platforms.join(", ")}.
- Vary contentPillar across: ${CONTENT_PILLARS.join(", ")}.
- "role" is one of: anchor, support, proof, offer, engagement.
- Every item must ladder up to the thesis. No filler.`,
  ].join("\n");

  const userLines = [
    `Campaign name: ${opts.name}`,
    `Goal: ${opts.goal.replace(/_/g, " ")}`,
    opts.brief ? `Brief from the operator: ${opts.brief}` : null,
  ];
  if (opts.likedIdeas && opts.likedIdeas.length > 0) {
    userLines.push("", "Build on these brainstorm ideas the operator liked:");
    opts.likedIdeas.slice(0, 8).forEach((idea, i) => {
      userLines.push(`${i + 1}. ${idea.title ?? idea.hook ?? ""}${idea.description ? ` — ${idea.description}` : ""}`);
    });
  }
  userLines.push("", "Return only valid JSON.");

  return { system, user: userLines.filter((l): l is string => l !== null).join("\n") };
}

// ─── Weekly Report ────────────────────────────────────────────────────────────

export function buildWeeklyReportPrompt(
  ctx: PromptContext,
  data: {
    periodLabel: string;
    summary: Record<string, number>;
    topPosts: Array<{ title?: string | null; platform: string; status: string; isWinner?: boolean | null }>;
    pillarBreakdown: Array<{ pillar: string; count: number }>;
    platformBreakdown: Array<{ platform: string; published: number; total: number }>;
    recentSignals: Array<{ direction: string; content?: string | null }>;
  },
): { system: string; user: string } {
  const system = [
    "You are the AI marketing operator for the brand described below, writing its weekly performance report.",
    "",
    buildBrandBlock(ctx),
    "",
    `Write an honest, specific, operator-grade weekly report. Return only valid JSON, no markdown fences:
{
  "headline": "one-sentence summary of the week",
  "whatWorked": ["..."],
  "whatFailed": ["..."],
  "whatToRepeat": ["..."],
  "whatToStop": ["..."],
  "whatToRepurpose": ["..."],
  "whatToGenerateNext": ["..."]
}
Each array holds 2-4 short, concrete bullet strings. Ground every claim in the data provided — if the data is thin, say so plainly instead of inventing results.`,
  ].join("\n");

  const user = [
    `Reporting period: ${data.periodLabel}`,
    `Post pipeline counts: ${JSON.stringify(data.summary)}`,
    `Top/recent posts: ${JSON.stringify(data.topPosts.slice(0, 10))}`,
    `Content pillar mix: ${JSON.stringify(data.pillarBreakdown)}`,
    `Platform mix: ${JSON.stringify(data.platformBreakdown)}`,
    `Recent preference signals: ${JSON.stringify(data.recentSignals.slice(0, 10))}`,
    "Return only valid JSON.",
  ].join("\n");

  return { system, user };
}
