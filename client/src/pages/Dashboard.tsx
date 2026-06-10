import { ApprovalCard } from "@/components/ApprovalCard";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { StatCard } from "@/components/StatCard";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { trpc } from "@/lib/trpc";
import { CAMPAIGN_GOAL_LABELS, type CampaignGoal } from "@shared/platforms";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  FileText,
  Lightbulb,
  Megaphone,
  Plus,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CHART_COLORS = ["#22d3ee", "#34d399", "#f59e0b", "#f87171", "#818cf8", "#e879f9", "#fbbf24", "#4ade80"];

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  draft: "bg-muted/60 text-muted-foreground",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();

  const { data: summary } = trpc.analytics.summary.useQuery({ clientId }, { enabled });
  const { data: byPlatform } = trpc.analytics.byPlatform.useQuery({ clientId }, { enabled });
  const { data: pendingPosts } = trpc.posts.pendingApproval.useQuery({ clientId }, { enabled });
  const { data: campaigns } = trpc.campaigns.getCampaigns.useQuery({ clientId }, { enabled });

  const approveMutation = trpc.posts.approve.useMutation({
    onSuccess: () => {
      toast.success("Post approved — ready to schedule or publish");
      utils.posts.invalidate();
      utils.analytics.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.posts.reject.useMutation({
    onSuccess: () => {
      toast.success("Post rejected");
      utils.posts.invalidate();
      utils.analytics.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!enabled) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Users}
          title="Add your first client"
          description="Everything here is scoped to a client workspace. Create one to start generating content."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  const queuePreview = (pendingPosts ?? []).slice(0, 3);
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "active" || c.status === "draft");
  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="container py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            {activeClient?.name} · command center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            What needs you today{activeClient?.industry ? ` — ${activeClient.industry}` : ""}
          </p>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setLocation("/brainstorm")}>
            <Lightbulb className="h-4 w-4 mr-1.5" /> Brainstorm
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setLocation("/campaigns?new=1")}>
            <Plus className="h-4 w-4 mr-1.5" /> New campaign
          </Button>
          <Button size="sm" className="rounded-xl glow-primary" onClick={() => setLocation("/generate")}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Generate post
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending approval"
          value={summary?.pending ?? 0}
          icon={CheckSquare}
          accent="text-amber-400"
          hint="Waiting in the queue"
          onClick={() => setLocation("/queue")}
        />
        <StatCard
          label="Scheduled"
          value={summary?.scheduled ?? 0}
          icon={CalendarClock}
          accent="text-blue-400"
          hint="Going out automatically"
          onClick={() => setLocation("/calendar")}
        />
        <StatCard
          label="Published"
          value={summary?.published ?? 0}
          icon={CheckCircle2}
          accent="text-primary"
        />
        <StatCard
          label="Total posts"
          value={summary?.total ?? 0}
          icon={FileText}
        />
      </div>

      {/* Needs your approval */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-amber-400" />
            Needs your approval
            {(pendingPosts?.length ?? 0) > 0 && (
              <Badge className="h-5 px-1.5 text-xs bg-amber-500/20 text-amber-400 border-0">
                {pendingPosts?.length}
              </Badge>
            )}
          </h2>
          <Button variant="ghost" size="sm" className="text-xs rounded-lg" onClick={() => setLocation("/queue")}>
            View all
          </Button>
        </div>
        {queuePreview.length === 0 ? (
          <PremiumCard className="py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All caught up — nothing pending review</p>
          </PremiumCard>
        ) : (
          <StaggerList className="space-y-3">
            {queuePreview.map((post) => (
              <StaggerItem key={post.id}>
                <ApprovalCard
                  post={post}
                  busy={busy}
                  actions={{
                    onApprove: (p) => approveMutation.mutate({ id: p.id }),
                    onReject: (p) => rejectMutation.mutate({ id: p.id }),
                    onEdit: () => setLocation("/queue"),
                  }}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>

      {/* Active campaigns */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Active campaigns
          </h2>
          <Button variant="ghost" size="sm" className="text-xs rounded-lg" onClick={() => setLocation("/campaigns")}>
            View all
          </Button>
        </div>
        {activeCampaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns running"
            description="A campaign turns ideas into a day-by-day content plan and generates every asset."
            actionLabel="Plan a campaign"
            onAction={() => setLocation("/campaigns")}
          />
        ) : (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCampaigns.map((campaign) => (
              <StaggerItem key={campaign.id}>
                <PremiumCard
                  interactive
                  onClick={() => setLocation(`/campaigns/${campaign.id}`)}
                  className="p-4 sm:p-5 h-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-semibold leading-snug">{campaign.name}</p>
                    <Badge
                      className={`rounded-lg border-0 capitalize shrink-0 ${CAMPAIGN_STATUS_STYLES[campaign.status] ?? CAMPAIGN_STATUS_STYLES.draft}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {CAMPAIGN_GOAL_LABELS[campaign.goal as CampaignGoal] ?? campaign.goal}
                  </p>
                </PremiumCard>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>

      {/* Platform breakdown */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Posts by platform
        </h2>
        <PremiumCard className="p-4 sm:p-5">
          {byPlatform && byPlatform.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byPlatform} barSize={32}>
                <XAxis
                  dataKey="platform"
                  tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => PLATFORM_CONFIG[v as keyof typeof PLATFORM_CONFIG]?.label ?? v}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.13 0.01 240)",
                    border: "1px solid oklch(0.22 0.015 240)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.005 240)",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "oklch(0.18 0.015 240)" }}
                />
                <Bar dataKey="published" name="Published" radius={[4, 4, 0, 0]}>
                  {byPlatform.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No published posts yet</p>
            </div>
          )}
        </PremiumCard>
      </section>
    </div>
  );
}
