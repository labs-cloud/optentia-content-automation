/**
 * Shared platform / pillar / campaign constants.
 * Single source of truth for both the tRPC routers and the React client
 * (and a future Expo app — keep this file framework-free).
 */

export const PLATFORMS = [
  "instagram",
  "linkedin",
  "linkedin_personal",
  "linkedin_company",
  "facebook",
  "youtube",
  "email",
  "whatsapp",
] as const;

export type Platform = (typeof PLATFORMS)[number];

/** Channels that are generated but sent manually (no auto-publish integration yet). */
export const MANUAL_PLATFORMS: readonly Platform[] = ["email", "whatsapp"];

export function isManualPlatform(platform: string): boolean {
  return MANUAL_PLATFORMS.includes(platform as Platform);
}

export const CONTENT_PILLARS = [
  "strong_opinion",
  "practical_education",
  "documentary",
  "direct_promotion",
] as const;

export type ContentPillar = (typeof CONTENT_PILLARS)[number];

export const CAMPAIGN_GOALS = [
  "awareness",
  "leads",
  "authority",
  "offer_push",
  "re_engagement",
  "education",
  "testimonial_proof",
] as const;

export type CampaignGoal = (typeof CAMPAIGN_GOALS)[number];

export const CAMPAIGN_GOAL_LABELS: Record<CampaignGoal, string> = {
  awareness: "Awareness",
  leads: "Leads",
  authority: "Authority",
  offer_push: "Offer Push",
  re_engagement: "Re-engagement",
  education: "Education",
  testimonial_proof: "Testimonial / Proof",
};

export const IDEA_TYPES = [
  "post_hook",
  "campaign_angle",
  "reel_idea",
  "carousel_idea",
  "email_angle",
  "whatsapp_message",
  "ad_concept",
  "visual_concept",
  "offer_angle",
] as const;

export type IdeaType = (typeof IDEA_TYPES)[number];

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  post_hook: "Post Hook",
  campaign_angle: "Campaign Angle",
  reel_idea: "Reel Idea",
  carousel_idea: "Carousel Idea",
  email_angle: "Email Angle",
  whatsapp_message: "WhatsApp Message",
  ad_concept: "Ad Concept",
  visual_concept: "Visual Concept",
  offer_angle: "Offer Angle",
};

/**
 * Static recommended posting times per platform (local time of the audience).
 * v1 heuristic — replaced by learned times once performance snapshots accumulate.
 */
export const RECOMMENDED_POSTING_TIMES: Record<Platform, string[]> = {
  instagram: ["08:00", "12:00", "19:00"],
  linkedin: ["07:30", "12:00", "17:00"],
  linkedin_personal: ["07:30", "12:00", "17:00"],
  linkedin_company: ["09:00", "13:00"],
  facebook: ["09:00", "13:00", "20:00"],
  youtube: ["12:00", "18:00"],
  email: ["07:00", "10:00"],
  whatsapp: ["10:00", "18:00"],
};
