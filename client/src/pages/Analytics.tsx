import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { AIThinkingState } from "@/components/AIThinkingState";
import { ContentPreviewCard } from "@/components/ContentPreviewCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PremiumCard } from "@/components/PremiumCard";
import { StatCard } from "@/components/StatCard";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  FileText,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const CHART_COLORS = ["#22d3ee", "#34d399", "#818cf8", "#f87171", "#f59e0b", "#e879f9", "#fbbf24", "#4ade80"];

const TOOLTIP_STYLE = {
  background: "oklch(0.13 0.01 240)",
  border: "1px solid oklch(0.22 0.015 240)",
  borderRadius: "8px",
  color: "oklch(0.95 0.005 240)",
  fontSize: "12px",
};

type WeeklyReport = {
  headline?: string;
  whatWorked?: string[];
  whatFailed?: string[];
  whatToRepeat?: string[];
  whatToStop?: string[];
  whatToRepurpose?: string[];
  whatToGenerateNext?: string[];
  generatedAt: string;
};

export default function Analytics() {
  const [, setLocation] = useLocation();
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const [report, setReport] = useState<WeeklyReport | null>(null);

  const { data: summary } = trpc.analytics.summary.useQuery({ clientId }, { enabled });
  const { data: byPlatform } = trpc.analytics.byPlatform.useQuery({ clientId }, { enabled });
  const { data: overTime } = trpc.analytics.publishedOverTime.useQuery({ clientId }, { enabled });
  const { data: topPosts } = trpc.analytics.topPosts.useQuery({ clientId, limit: 6 }, { enabled });
  const { data: modelRuns } = trpc.analytics.modelRunSummary.useQuery({ clientId }, { enabled });

  const reportMutation = trpc.analytics.generateWeeklyReport.useMutation({
    onSuccess: (data) => setReport(data),
    onError: (e) => toast.error(e.message),
  });

  // publishedOverTime rows are grouped by date+platform — collapse to per-day totals.
  const overTimeData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const row of overTime ?? []) {
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + Number(row.count));
    }
    return [...byDate.entries()].map(([date, count]) => ({ date, count }));
  }, [overTime]);

  const pieData = (byPlatform ?? []).filter((p) => p.total > 0).map((p, i) => ({
    name: PLATFORM_CONFIG[p.platform as keyof typeof PLATFORM_CONFIG]?.label ?? p.platform,
    value: p.total,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  if (!enabled) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Users}
          title="No client selected"
          description="Pick or create a client to see its performance and learning loop."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  const reportSections: { title: string; items?: string[] }[] = report
    ? [
        { title: "What worked", items: report.whatWorked },
        { title: "What failed", items: report.whatFailed },
        { title: "Repeat", items: report.whatToRepeat },
        { title: "Stop", items: report.whatToStop },
        { title: "Repurpose", items: report.whatToRepurpose },
        { title: "Generate next", items: report.whatToGenerateNext },
      ]
    : [];

  return (
    <div className="container py-6 sm:py-8 space-y-8">
      <PageHeader
        eyebrow={activeClient?.name ? `Insights · ${activeClient.name}` : "Insights"}
        title="Analytics"
        pill="Performance and learning loop"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total posts" value={summary?.total ?? 0} icon={FileText} />
        <StatCard label="Published" value={summary?.published ?? 0} icon={CheckCircle2} accent="text-primary" />
        <StatCard label="Scheduled" value={summary?.scheduled ?? 0} icon={Clock} accent="text-blue-400" />
        <StatCard label="Rejected" value={summary?.rejected ?? 0} icon={XCircle} accent="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Breakdown Bar Chart */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Posts by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(byPlatform ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byPlatform} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.015 240)" vertical={false} />
                  <XAxis
                    dataKey="platform"
                    tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => PLATFORM_CONFIG[v as keyof typeof PLATFORM_CONFIG]?.label ?? v}
                  />
                  <YAxis tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "oklch(0.18 0.015 240)" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "oklch(0.55 0.01 240)" }} />
                  <Bar dataKey="total" name="Total" radius={[3, 3, 0, 0]} fill="oklch(0.22 0.015 240)" />
                  <Bar dataKey="published" name="Published" radius={[3, 3, 0, 0]}>
                    {(byPlatform ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar dataKey="scheduled" name="Scheduled" radius={[3, 3, 0, 0]} fill="oklch(0.55 0.18 230 / 0.6)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No data yet — start generating content</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[160px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Published Over Time */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Published Over Time (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={overTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.015 240)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Published"
                  stroke="#22d3ee"
                  fill="#22d3ee"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Nothing published in the last 30 days</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performing */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Top performing
        </h2>
        {(topPosts ?? []).length === 0 ? (
          <PremiumCard className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No published posts yet — winners and recent publishes show up here.
            </p>
          </PremiumCard>
        ) : (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(topPosts ?? []).map((post) => (
              <StaggerItem key={post.id}>
                <ContentPreviewCard post={post} className="h-full" />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>

      {/* AI Usage */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          AI usage
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Model runs" value={modelRuns?.runs ?? 0} icon={Cpu} />
          <StatCard
            label="Total tokens"
            value={((modelRuns?.inputTokens ?? 0) + (modelRuns?.outputTokens ?? 0)).toLocaleString()}
            icon={Sparkles}
            hint={`${(modelRuns?.inputTokens ?? 0).toLocaleString()} in · ${(modelRuns?.outputTokens ?? 0).toLocaleString()} out`}
          />
          <StatCard
            label="Estimated cost"
            value={`$${((modelRuns?.estimatedCostMicros ?? 0) / 1_000_000).toFixed(2)}`}
            icon={DollarSign}
            accent="text-emerald-400"
          />
        </div>
      </section>

      {/* Weekly Report */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Weekly report
        </h2>
        <PremiumCard className="p-5 sm:p-6">
          {reportMutation.isPending ? (
            <AIThinkingState
              label="Writing the weekly report"
              messages={[
                "Reading the week's posts…",
                "Comparing winners and flops…",
                "Checking your approval signals…",
                "Deciding what to double down on…",
                "Drafting recommendations…",
              ]}
            />
          ) : report ? (
            <div className="space-y-5">
              {report.headline && (
                <h3 className="font-display text-xl font-bold tracking-tight">{report.headline}</h3>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {reportSections
                  .filter((section) => (section.items?.length ?? 0) > 0)
                  .map((section) => (
                    <div key={section.title}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        {section.title}
                      </p>
                      <ul className="space-y-1.5">
                        {section.items!.map((item, i) => (
                          <li key={i} className="text-sm leading-relaxed flex gap-2">
                            <span className="text-primary shrink-0">·</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <p className="text-xs text-muted-foreground">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => reportMutation.mutate({ clientId })}
                >
                  <Sparkles className="h-4 w-4 mr-1.5" /> Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium">What worked, what flopped, what to do next</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI reviews the week's content and your feedback, then tells you what to repeat, stop, and repurpose.
                </p>
              </div>
              <Button className="rounded-xl shrink-0" onClick={() => reportMutation.mutate({ clientId })}>
                <Sparkles className="h-4 w-4 mr-1.5" /> Generate weekly report
              </Button>
            </div>
          )}
        </PremiumCard>
      </section>
    </div>
  );
}
