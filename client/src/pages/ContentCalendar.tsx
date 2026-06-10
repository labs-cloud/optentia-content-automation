import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, STATUS_CONFIG, type Platform } from "@/lib/platformUtils";
import { RECOMMENDED_POSTING_TIMES } from "@shared/platforms";
import { useClientScope } from "@/contexts/ActiveClientContext";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PLATFORM_FILTER_OPTIONS = [
  { value: "all", label: "All Platforms" },
  ...Object.entries(PLATFORM_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
];

export default function ContentCalendar() {
  const today = new Date();
  const [, setLocation] = useLocation();
  const { clientId, enabled } = useClientScope();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: posts } = trpc.posts.list.useQuery({ clientId, limit: 500 }, { enabled });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  if (!enabled) {
    return (
      <div className="p-6 max-w-6xl">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Select a client workspace to view its content calendar."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Client-side filters
  const filteredPosts = (posts ?? []).filter(
    (p) =>
      (platformFilter === "all" || p.platform === platformFilter) &&
      (statusFilter === "all" || p.status === statusFilter)
  );

  // Group posts by day
  const postsByDay: Record<number, typeof filteredPosts> = {};
  const monthPlatforms = new Set<Platform>();
  filteredPosts.forEach((post) => {
    const date = post.scheduledAt || post.publishedAt || post.createdAt;
    if (!date) return;
    const d = new Date(date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day]!.push(post);
      monthPlatforms.add(post.platform as Platform);
    }
  });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  const visiblePlatforms = Array.from(monthPlatforms);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Content Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your content schedule by date
        </p>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-44 bg-muted/30 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-muted/30 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {posts && posts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing on the calendar yet"
          description="Generate a campaign to fill this month with scheduled content."
          actionLabel="Generate a campaign"
          onAction={() => setLocation("/campaigns?new=1")}
        />
      ) : (
        <>
          {/* Calendar Grid */}
          <Card className="bg-card border-border/50 overflow-hidden">
            <CardContent className="p-0">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border/50">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-3 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const dayPosts = day ? (postsByDay[day] ?? []) : [];
                  return (
                    <div
                      key={i}
                      className={`min-h-24 p-2 border-b border-r border-border/30 last:border-r-0 ${
                        !day ? "bg-muted/10" : "hover:bg-muted/20 transition-colors"
                      } ${i % 7 === 6 ? "border-r-0" : ""}`}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-medium mb-1.5 h-6 w-6 flex items-center justify-center rounded-full ${
                            isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                          }`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {dayPosts.slice(0, 3).map((post) => {
                              const cfg = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                              const isPublished = post.status === "published";
                              const isScheduled = post.status === "scheduled";
                              return (
                                <div
                                  key={post.id}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate ${
                                    isPublished ? "bg-primary/10 text-primary" :
                                    isScheduled ? "bg-blue-500/10 text-blue-400" :
                                    "bg-muted/40 text-muted-foreground"
                                  }`}
                                  title={post.title || post.caption || ""}
                                >
                                  <span className="text-xs">{cfg?.icon}</span>
                                  <span className="truncate text-xs">{post.title || (post.caption?.substring(0, 20) + "…")}</span>
                                </div>
                              );
                            })}
                            {dayPosts.length > 3 && (
                              <p className="text-xs text-muted-foreground px-1">+{dayPosts.length - 3} more</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recommended posting times */}
          {visiblePlatforms.length > 0 && (
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wide">Recommended times</span>
              {visiblePlatforms.map((p) => (
                <span key={p}>
                  {PLATFORM_CONFIG[p]?.label ?? p}: {(RECOMMENDED_POSTING_TIMES[p] ?? []).join(" · ")}
                </span>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-primary/20" />
              Published
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500/20" />
              Scheduled
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-muted/60" />
              Draft / Pending
            </div>
          </div>
        </>
      )}
    </div>
  );
}
