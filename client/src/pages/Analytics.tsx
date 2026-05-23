import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CheckCircle2, Clock, TrendingUp, XCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie,
} from "recharts";

const CHART_COLORS = ["#22d3ee", "#34d399", "#818cf8", "#f87171"];

export default function Analytics() {
  const { data: summary, isLoading } = trpc.analytics.summary.useQuery();
  const { data: byPlatform } = trpc.analytics.byPlatform.useQuery();
  const { data: overTime } = trpc.analytics.publishedOverTime.useQuery();

  const pieData = (byPlatform ?? []).filter((p) => p.total > 0).map((p, i) => ({
    name: PLATFORM_CONFIG[p.platform as keyof typeof PLATFORM_CONFIG]?.label ?? p.platform,
    value: p.total,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const statCards = [
    { label: "Total Posts", value: summary?.total ?? 0, icon: BarChart3, color: "text-muted-foreground", bg: "bg-muted/30" },
    { label: "Published", value: summary?.published ?? 0, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
    { label: "Scheduled", value: summary?.scheduled ?? 0, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Rejected", value: summary?.rejected ?? 0, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Content performance and publishing metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</span>
                <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className={`text-3xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
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
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.13 0.01 240)",
                        border: "1px solid oklch(0.22 0.015 240)",
                        borderRadius: "8px",
                        color: "oklch(0.95 0.005 240)",
                        fontSize: "12px",
                      }}
                    />
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

      {/* Status Breakdown */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total", value: summary?.total ?? 0, color: "text-foreground" },
              { label: "Published", value: summary?.published ?? 0, color: "text-primary" },
              { label: "Scheduled", value: summary?.scheduled ?? 0, color: "text-blue-400" },
              { label: "Pending", value: summary?.pending ?? 0, color: "text-amber-400" },
              { label: "Rejected", value: summary?.rejected ?? 0, color: "text-red-400" },
              { label: "Failed", value: summary?.failed ?? 0, color: "text-destructive" },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 rounded-xl bg-muted/20">
                <p className={`text-2xl font-display font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
