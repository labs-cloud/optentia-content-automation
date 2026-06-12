import type { Platform } from "../../../../shared/platforms";

export type { Platform } from "../../../../shared/platforms";

export type PostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "failed";

/**
 * Class-name-free platform/status metadata, safe to share with React Native
 * (the web `client/src/lib/platformUtils.ts` keeps its Tailwind className maps;
 * native consumes the hex values below directly via style props / NativeWind).
 */
export const PLATFORM_META: Record<
  Platform,
  { label: string; icon: string; hex: string }
> = {
  instagram: { label: "Instagram", icon: "📸", hex: "#DD2A7B" },
  linkedin: { label: "LinkedIn", icon: "💼", hex: "#0A66C2" },
  linkedin_personal: { label: "LinkedIn (Personal)", icon: "👤", hex: "#0A66C2" },
  linkedin_company: { label: "LinkedIn (Company)", icon: "🏢", hex: "#0A66C2" },
  facebook: { label: "Facebook", icon: "👥", hex: "#1877F2" },
  youtube: { label: "YouTube", icon: "▶️", hex: "#FF0000" },
  email: { label: "Email", icon: "✉️", hex: "#F59E0B" },
  whatsapp: { label: "WhatsApp", icon: "💬", hex: "#25D366" },
};

export const STATUS_META: Record<PostStatus, { label: string; hex: string }> = {
  draft: { label: "Draft", hex: "#6B7B90" },
  pending_approval: { label: "Pending Review", hex: "#F59E0B" },
  approved: { label: "Approved", hex: "#34D399" },
  scheduled: { label: "Scheduled", hex: "#6AA0F5" },
  published: { label: "Published", hex: "#5FD0DE" },
  rejected: { label: "Rejected", hex: "#FF5B5B" },
  failed: { label: "Failed", hex: "#EF4444" },
};

export const CONTENT_PILLARS = [
  { value: "strong_opinion", label: "Strong Opinion / Take", description: "Bold takes and contrarian thinking in the brand's space" },
  { value: "practical_education", label: "Practical Education", description: "Actionable how-tos tied to the brand's offer" },
  { value: "documentary", label: "Documentary / Lifestyle", description: "Behind-the-scenes of the brand's work and process" },
  { value: "direct_promotion", label: "Direct Promotion", description: "Case studies, offers, and direct CTAs" },
] as const;

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

export function formatScheduledTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string | null | undefined, len = 120): string {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "…" : str;
}
