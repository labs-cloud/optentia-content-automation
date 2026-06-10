import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { CAMPAIGN_GOAL_LABELS, type CampaignGoal, type Platform } from "@shared/platforms";
import { cn } from "@/lib/utils";
import { CalendarRange, Target } from "lucide-react";
import { PremiumCard } from "./PremiumCard";
import { Badge } from "./ui/badge";

export type CampaignCardData = {
  id: number;
  name: string;
  goal: string;
  thesis: string | null;
  platforms: unknown;
  durationDays: number;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/50 text-muted-foreground",
  generating: "bg-amber-500/10 text-amber-400",
  active: "bg-emerald-500/10 text-emerald-400",
  completed: "bg-blue-500/10 text-blue-400",
  archived: "bg-muted/40 text-muted-foreground/70",
};

export function CampaignCard({ campaign, onClick }: { campaign: CampaignCardData; onClick?: () => void }) {
  const platforms = Array.isArray(campaign.platforms) ? (campaign.platforms as string[]) : [];
  const goalLabel = CAMPAIGN_GOAL_LABELS[campaign.goal as CampaignGoal] ?? campaign.goal;

  return (
    <PremiumCard interactive onClick={onClick} className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-semibold text-base leading-tight">{campaign.name}</h3>
        <Badge className={cn("rounded-lg border-0 capitalize shrink-0", STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft)}>
          {campaign.status}
        </Badge>
      </div>

      {campaign.thesis ? (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{campaign.thesis}</p>
      ) : (
        <p className="text-sm text-muted-foreground/60 italic">No thesis yet — generate the plan.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-auto pt-1">
        <span className="inline-flex items-center gap-1">
          <Target className="h-3.5 w-3.5" /> {goalLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarRange className="h-3.5 w-3.5" /> {campaign.durationDays} days
        </span>
        <span className="inline-flex items-center gap-1">
          {platforms.slice(0, 4).map((p) => (
            <span key={p} title={PLATFORM_CONFIG[p as Platform]?.label ?? p}>
              {PLATFORM_CONFIG[p as Platform]?.icon ?? "•"}
            </span>
          ))}
          {platforms.length > 4 && <span>+{platforms.length - 4}</span>}
        </span>
      </div>
    </PremiumCard>
  );
}
