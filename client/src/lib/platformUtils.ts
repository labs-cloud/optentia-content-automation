export type Platform = "instagram" | "linkedin" | "linkedin_personal" | "linkedin_company" | "facebook" | "youtube";
export type PostStatus = "draft" | "pending_approval" | "approved" | "scheduled" | "published" | "rejected" | "failed";

export const PLATFORM_CONFIG: Record<Platform, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  instagram: {
    label: "Instagram",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    icon: "📸",
  },
  linkedin: {
    label: "LinkedIn",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: "💼",
  },
  linkedin_personal: {
    label: "LinkedIn (Personal)",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: "👤",
  },
  linkedin_company: {
    label: "LinkedIn (Company)",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    icon: "🏢",
  },
  facebook: {
    label: "Facebook",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    icon: "👥",
  },
  youtube: {
    label: "YouTube",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: "▶️",
  },
};

export const STATUS_CONFIG: Record<PostStatus, {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
}> = {
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    dotColor: "bg-muted-foreground",
  },
  pending_approval: {
    label: "Pending Review",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    dotColor: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    dotColor: "bg-emerald-400",
  },
  scheduled: {
    label: "Scheduled",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    dotColor: "bg-blue-400",
  },
  published: {
    label: "Published",
    color: "text-primary",
    bgColor: "bg-primary/10",
    dotColor: "bg-primary",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    dotColor: "bg-red-400",
  },
  failed: {
    label: "Failed",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    dotColor: "bg-destructive",
  },
};

export const CONTENT_PILLARS = [
  { value: "strong_opinion", label: "Strong Opinion / Take", description: "Bold business takes, AI misuse, systems thinking" },
  { value: "practical_education", label: "Practical AI Education", description: "Automation workflows, CRM systems, voice AI demos" },
  { value: "documentary", label: "Documentary / Lifestyle", description: "Daily workflows, desk setups, business building" },
  { value: "direct_promotion", label: "Direct Promotion", description: "Case studies, DM offers, consultation calls" },
];

export const CRON_PRESETS = [
  { label: "Daily at 9am UTC", value: "0 0 9 * * *" },
  { label: "Daily at 12pm UTC", value: "0 0 12 * * *" },
  { label: "Daily at 6pm UTC", value: "0 0 18 * * *" },
  { label: "Twice daily (9am & 6pm UTC)", value: "0 0 9,18 * * *" },
  { label: "Weekdays at 9am UTC", value: "0 0 9 * * 1-5" },
  { label: "Weekdays twice daily", value: "0 0 9,17 * * 1-5" },
];

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
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
