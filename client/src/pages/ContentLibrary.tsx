import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, STATUS_CONFIG, formatRelativeTime, truncate } from "@/lib/platformUtils";
import { useClientScope } from "@/contexts/ActiveClientContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Briefcase, FolderOpen, Search, Sparkles, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "linkedin_personal", label: "LinkedIn (Personal)" },
  { value: "linkedin_company", label: "LinkedIn (Company)" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function ContentLibrary() {
  const [, setLocation] = useLocation();
  const { clientId, enabled } = useClientScope();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const utils = trpc.useUtils();

  const { data: posts, isLoading } = trpc.posts.list.useQuery(
    {
      clientId,
      status: statusFilter === "all" ? undefined : statusFilter,
      platform: platformFilter === "all" ? undefined : platformFilter,
      limit: 100,
    },
    { enabled }
  );

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      utils.posts.list.invalidate();
      utils.analytics.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (posts ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.hashtags?.toLowerCase().includes(q)
    );
  });

  if (!enabled) {
    return (
      <div className="p-6 max-w-5xl">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Select a client workspace to browse its content library."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Operate"
        title="Content Library"
        pill="All generated and published content"
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="pl-9 bg-muted/30 border-border/50"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40 bg-muted/30 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-muted/30 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">{filtered.length} post{filtered.length !== 1 ? "s" : ""}</p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No posts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((post) => {
            const cfg = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
            const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG];
            return (
              <Card key={post.id} className="bg-card border-border/50 hover:border-border transition-colors group">
                {/* Image banner if available */}
                {(post as any).imageUrl && (
                  <div className="relative h-40 overflow-hidden rounded-t-xl">
                    <img
                      src={(post as any).imageUrl}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/50 text-white backdrop-blur-sm">
                      <Sparkles className="h-3 w-3" />
                      AI Image
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`h-9 w-9 rounded-lg ${cfg?.bgColor} border ${cfg?.borderColor} flex items-center justify-center shrink-0`}>
                      <span className="text-base">{cfg?.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-medium ${cfg?.color}`}>{cfg?.label}</span>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${statusCfg?.bgColor} ${statusCfg?.color}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${statusCfg?.dotColor}`} />
                          {statusCfg?.label}
                        </div>
                        {post.aiGenerated && (
                          <Sparkles className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate({ id: post.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {post.title && (
                    <p className="text-sm font-semibold mb-1 line-clamp-1">{post.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {post.caption}
                  </p>
                  {post.hashtags && (
                    <p className="text-xs text-primary/60 mt-1.5 line-clamp-1">{post.hashtags}</p>
                  )}
                  {(post as any).externalPostId && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-400">
                      <span className="font-mono">Published · ID: {(post as any).externalPostId?.substring(0, 16)}...</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-2">{formatRelativeTime(post.createdAt)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
