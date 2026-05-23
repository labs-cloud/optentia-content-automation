import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, STATUS_CONFIG, formatRelativeTime, truncate } from "@/lib/platformUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  Sparkles,
  TrendingUp,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: byPlatform } = trpc.analytics.byPlatform.useQuery();
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: pendingPosts } = trpc.posts.pendingApproval.useQuery();
  const { data: recentPosts } = trpc.analytics.recentPosts.useQuery({ limit: 5 });

  const statCards = [
    {
      label: "Total Posts",
      value: summary?.total ?? 0,
      icon: FileText,
      color: "text-muted-foreground",
      bg: "bg-muted/30",
    },
    {
      label: "Published",
      value: summary?.published ?? 0,
      icon: CheckCircle2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Scheduled",
      value: summary?.scheduled ?? 0,
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Pending Review",
      value: summary?.pending ?? 0,
      icon: CheckSquare,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  const chartColors = ["#22d3ee", "#34d399", "#f59e0b", "#f87171"];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your Optentia content command center
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/queue")} className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Review Queue
            {(summary?.pending ?? 0) > 0 && (
              <Badge className="h-5 min-w-5 px-1 text-xs bg-amber-500/20 text-amber-400 border-0">
                {summary?.pending}
              </Badge>
            )}
          </Button>
          <Button size="sm" onClick={() => setLocation("/generate")} className="gap-2 glow-primary">
            <Sparkles className="h-4 w-4" />
            Generate Content
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {stat.label}
                </span>
                <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className={`text-3xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Breakdown Chart */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Posts by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No published posts yet</p>
              </div>
            )}
            {/* Platform stats row */}
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
              {(byPlatform ?? []).map((p, i) => {
                const cfg = PLATFORM_CONFIG[p.platform as keyof typeof PLATFORM_CONFIG];
                return (
                  <div key={p.platform} className="text-center">
                    <div className={`text-lg font-display font-bold`} style={{ color: chartColors[i] }}>
                      {p.total}
                    </div>
                    <div className="text-xs text-muted-foreground">{cfg?.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Platform Connection Status */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4 text-primary" />
              Platform Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(platforms ?? []).map((p) => {
              const cfg = PLATFORM_CONFIG[p.platform as keyof typeof PLATFORM_CONFIG];
              const isConnected = p.status === "connected";
              return (
                <div key={p.platform} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cfg?.icon}</span>
                    <span className="text-sm font-medium">{cfg?.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                    <span className={`text-xs ${isConnected ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {isConnected ? "Connected" : "Not set"}
                    </span>
                  </div>
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => setLocation("/platforms")}
            >
              Manage Connections
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approval */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-amber-400" />
              Pending Approval
              {(pendingPosts?.length ?? 0) > 0 && (
                <Badge className="h-5 px-1.5 text-xs bg-amber-500/20 text-amber-400 border-0">
                  {pendingPosts?.length}
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/queue")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pendingPosts ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up — no posts pending review</p>
              </div>
            ) : (
              pendingPosts?.slice(0, 4).map((post) => {
                const cfg = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                return (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setLocation("/queue")}
                  >
                    <span className="text-base mt-0.5">{cfg?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title || truncate(post.caption, 50)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cfg?.label} · {formatRelativeTime(post.createdAt)}</p>
                    </div>
                    {post.aiGenerated && (
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Published */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recently Published
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/library")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentPosts ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No published posts yet</p>
              </div>
            ) : (
              recentPosts?.map((post) => {
                const cfg = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                return (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <span className="text-base mt-0.5">{cfg?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title || truncate(post.caption, 50)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cfg?.label} · {formatRelativeTime(post.publishedAt)}
                      </p>
                    </div>
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
