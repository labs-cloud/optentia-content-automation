import { AIThinkingState } from "@/components/AIThinkingState";
import { ContentPreviewCard } from "@/components/ContentPreviewCard";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientScope } from "@/contexts/ActiveClientContext";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CAMPAIGN_GOAL_LABELS, type CampaignGoal, type Platform } from "@shared/platforms";
import { ArrowLeft, CalendarRange, Megaphone, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const ITEM_STATUS_STYLES: Record<string, string> = {
  planned: "bg-muted/50 text-muted-foreground",
  generated: "bg-blue-500/10 text-blue-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  published: "bg-primary/10 text-primary",
};

export default function CampaignDetail() {
  const [, params] = useRoute("/campaigns/:id");
  const campaignId = params ? parseInt(params.id, 10) : NaN;
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const { data: campaign, isLoading, error } = trpc.campaigns.getCampaignById.useQuery(
    { clientId, id: campaignId },
    { enabled: enabled && Number.isFinite(campaignId) },
  );

  const generateContent = trpc.campaigns.generateContentFromCampaign.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.generated} post${result.generated === 1 ? "" : "s"} generated`);
      if (result.errors.length > 0) toast.warning(`${result.errors.length} item(s) failed`);
      utils.campaigns.getCampaignById.invalidate({ clientId, id: campaignId });
      utils.posts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!enabled || isLoading) {
    return (
      <div className="container py-8">
        <AIThinkingState messages={["Loading campaign…"]} />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Megaphone}
          title="Campaign not found"
          description="It may belong to a different client workspace."
          actionLabel="Back to campaigns"
          onAction={() => setLocation("/campaigns")}
        />
      </div>
    );
  }

  const platforms = Array.isArray(campaign.platforms) ? (campaign.platforms as string[]) : [];
  const plannedCount = campaign.items.filter((i) => i.status === "planned").length;
  const itemsByDate = [...campaign.items].sort((a, b) => {
    const da = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
    const db = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;
    return da - db;
  });

  return (
    <div className="container py-6 sm:py-8 space-y-6">
      <Button variant="ghost" size="sm" className="rounded-lg -ml-2" onClick={() => setLocation("/campaigns")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Campaigns
      </Button>

      <PageHeader
        eyebrow="Campaign"
        title={campaign.name}
        actions={
          plannedCount > 0 ? (
            <Button
              className="rounded-xl"
              disabled={generateContent.isPending}
              onClick={() => generateContent.mutate({ clientId, campaignId: campaign.id })}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Generate all ({plannedCount})
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground -mt-2">
        <span className="inline-flex items-center gap-1.5">
          <Target className="h-4 w-4" /> {CAMPAIGN_GOAL_LABELS[campaign.goal as CampaignGoal] ?? campaign.goal}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="h-4 w-4" /> {campaign.durationDays} days
        </span>
        <span className="inline-flex items-center gap-1">
          {platforms.map((p) => (
            <span key={p} title={PLATFORM_CONFIG[p as Platform]?.label}>
              {PLATFORM_CONFIG[p as Platform]?.icon}
            </span>
          ))}
        </span>
        <Badge className={cn("rounded-lg border-0 capitalize", ITEM_STATUS_STYLES[campaign.status] ?? "bg-muted/50 text-muted-foreground")}>
          {campaign.status}
        </Badge>
      </div>

      {/* Thesis */}
      {campaign.thesis && (
        <PremiumCard glow className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Campaign thesis</p>
          <p className="font-display text-lg leading-relaxed">{campaign.thesis}</p>
          {campaign.offer && (
            <p className="text-sm text-muted-foreground mt-3">
              <span className="font-medium text-foreground/80">Drives toward:</span> {campaign.offer}
            </p>
          )}
        </PremiumCard>
      )}

      {generateContent.isPending && (
        <PremiumCard>
          <AIThinkingState
            label="Generating campaign content"
            messages={[
              "Writing in the brand voice…",
              "Laddering every post to the thesis…",
              "Generating platform-native formats…",
              "Creating graphics where needed…",
            ]}
          />
        </PremiumCard>
      )}

      {/* Content plan timeline */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold">Content plan</h2>
        {itemsByDate.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No content plan yet"
            description="Generate the campaign to build the day-by-day plan."
          />
        ) : (
          <div className="space-y-2">
            {itemsByDate.map((item) => {
              const platform = item.platform ? PLATFORM_CONFIG[item.platform as Platform] : null;
              return (
                <PremiumCard key={item.id} className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-[11px] text-muted-foreground uppercase">
                      {item.plannedDate
                        ? new Date(item.plannedDate).toLocaleDateString(undefined, { month: "short" })
                        : "—"}
                    </p>
                    <p className="font-display font-bold text-xl leading-none">
                      {item.plannedDate ? new Date(item.plannedDate).getDate() : "·"}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug line-clamp-1">{item.conceptTitle}</p>
                    {item.conceptDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.conceptDescription}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {platform && (
                      <Badge variant="outline" className={`rounded-md text-[11px] ${platform.borderColor} ${platform.color} ${platform.bgColor}`}>
                        {platform.icon}
                      </Badge>
                    )}
                    <Badge className={cn("rounded-md text-[11px] border-0 capitalize", ITEM_STATUS_STYLES[item.status])}>
                      {item.status}
                    </Badge>
                    {item.status === "planned" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={generateContent.isPending}
                        onClick={() => generateContent.mutate({ clientId, campaignId: campaign.id, itemId: item.id })}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate
                      </Button>
                    )}
                  </div>
                </PremiumCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Generated posts */}
      {campaign.posts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold">
            Generated posts <Badge variant="outline" className="rounded-lg ml-1">{campaign.posts.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaign.posts.map((post) => (
              <ContentPreviewCard key={post.id} post={post} onClick={() => setLocation("/queue")} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
