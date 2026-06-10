import { AIThinkingState } from "@/components/AIThinkingState";
import { CampaignCard } from "@/components/CampaignCard";
import { EmptyState } from "@/components/EmptyState";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_GOALS,
  CAMPAIGN_GOAL_LABELS,
  PLATFORMS,
  type CampaignGoal,
  type Platform,
} from "@shared/platforms";
import { Briefcase, Megaphone, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

const DURATIONS = [7, 14, 30] as const;
const WIZARD_PLATFORMS = PLATFORMS.filter((p) => p !== "linkedin");

export default function Campaigns() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<CampaignGoal>("awareness");
  const [duration, setDuration] = useState<number>(14);
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram", "linkedin_personal"]);
  const [brief, setBrief] = useState("");
  const [selectedIdeas, setSelectedIdeas] = useState<number[]>([]);

  useEffect(() => {
    if (new URLSearchParams(search).get("new") === "1") {
      setWizardOpen(true);
      setLocation("/campaigns", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data: campaigns, isLoading } = trpc.campaigns.getCampaigns.useQuery({ clientId }, { enabled });
  const { data: likedIdeas } = trpc.brainstorm.getBrainstormIdeas.useQuery(
    { clientId, status: "liked" },
    { enabled: enabled && wizardOpen },
  );
  const { data: savedIdeas } = trpc.brainstorm.getBrainstormIdeas.useQuery(
    { clientId, status: "saved" },
    { enabled: enabled && wizardOpen },
  );

  const createMutation = trpc.campaigns.createCampaign.useMutation({ onError: (e) => toast.error(e.message) });
  const generateMutation = trpc.campaigns.generateCampaign.useMutation({ onError: (e) => toast.error(e.message) });

  const launching = createMutation.isPending || generateMutation.isPending;

  const launch = async () => {
    if (!name.trim()) {
      toast.error("Give the campaign a name");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Pick at least one platform");
      return;
    }
    const campaign = await createMutation.mutateAsync({
      clientId,
      name,
      goal,
      durationDays: duration,
      platforms,
      brief: brief || undefined,
    });
    await generateMutation.mutateAsync({
      clientId,
      campaignId: campaign.id,
      ideaIds: selectedIdeas.length > 0 ? selectedIdeas : undefined,
    });
    toast.success("Campaign generated");
    utils.campaigns.getCampaigns.invalidate({ clientId });
    setWizardOpen(false);
    setName("");
    setBrief("");
    setSelectedIdeas([]);
    setLocation(`/campaigns/${campaign.id}`);
  };

  if (!enabled) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Pick or create a client to plan campaigns."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  const ideaPool = [...(likedIdeas ?? []), ...(savedIdeas ?? [])];

  return (
    <div className="container py-6 sm:py-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" /> Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Coordinated multi-day content runs for <span className="text-foreground font-medium">{activeClient?.name}</span> — not random posts.
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="rounded-xl">
          <Plus className="h-4 w-4 mr-1.5" /> New campaign
        </Button>
      </div>

      {isLoading ? (
        <AIThinkingState messages={["Loading campaigns…"]} />
      ) : !campaigns || campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="A campaign turns liked ideas into a thesis and a day-by-day content plan, then generates every asset."
          actionLabel="Plan your first campaign"
          onAction={() => setWizardOpen(true)}
          secondaryActionLabel="Brainstorm ideas first"
          onSecondaryAction={() => setLocation("/brainstorm")}
        />
      ) : (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <StaggerItem key={campaign.id}>
              <CampaignCard campaign={campaign} onClick={() => setLocation(`/campaigns/${campaign.id}`)} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      <Dialog open={wizardOpen} onOpenChange={(open) => !launching && setWizardOpen(open)}>
        <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          {launching ? (
            <AIThinkingState
              label="Building the campaign"
              messages={[
                "Reading the brand brain…",
                "Folding in your liked ideas…",
                "Writing the campaign thesis…",
                "Planning the day-by-day calendar…",
                "Assigning platforms and pillars…",
              ]}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">New campaign</DialogTitle>
                <DialogDescription>
                  Set the goal and constraints — the AI writes the thesis and the content plan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-name">Name</Label>
                  <Input
                    id="campaign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='e.g. "March lead push"'
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Goal</Label>
                  <div className="flex flex-wrap gap-2">
                    {CAMPAIGN_GOALS.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGoal(g)}
                        className={cn(
                          "rounded-xl border px-3 py-1.5 text-sm transition-colors",
                          goal === g
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:bg-accent/60",
                        )}
                      >
                        {CAMPAIGN_GOAL_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <div className="flex gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={cn(
                          "rounded-xl border px-4 py-1.5 text-sm transition-colors",
                          duration === d
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:bg-accent/60",
                        )}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    {WIZARD_PLATFORMS.map((p) => {
                      const config = PLATFORM_CONFIG[p];
                      const selected = platforms.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() =>
                            setPlatforms((prev) =>
                              selected ? prev.filter((x) => x !== p) : [...prev, p],
                            )
                          }
                          className={cn(
                            "rounded-xl border px-3 py-1.5 text-sm transition-colors",
                            selected
                              ? "border-primary/60 bg-primary/10 text-primary"
                              : "border-border/60 text-muted-foreground hover:bg-accent/60",
                          )}
                        >
                          {config.icon} {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="campaign-brief">Brief (optional)</Label>
                  <Textarea
                    id="campaign-brief"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    rows={2}
                    placeholder="Anything specific this campaign must do or say"
                    className="rounded-xl"
                  />
                </div>

                {ideaPool.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Build on liked ideas</Label>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {ideaPool.map((idea) => {
                        const selected = selectedIdeas.includes(idea.id);
                        return (
                          <button
                            key={idea.id}
                            onClick={() =>
                              setSelectedIdeas((prev) =>
                                selected ? prev.filter((x) => x !== idea.id) : [...prev, idea.id],
                              )
                            }
                            className={cn(
                              "w-full text-left rounded-xl border px-3 py-2 text-sm transition-colors",
                              selected
                                ? "border-primary/60 bg-primary/10"
                                : "border-border/60 hover:bg-accent/60",
                            )}
                          >
                            <span className="line-clamp-1">{idea.hook ?? idea.title}</span>
                            {idea.status === "saved" && (
                              <Badge variant="outline" className="rounded text-[10px] mt-1">saved for campaign</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setWizardOpen(false)}>
                  Cancel
                </Button>
                <Button className="rounded-xl" onClick={launch}>
                  <Sparkles className="h-4 w-4 mr-1.5" /> Generate campaign
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
