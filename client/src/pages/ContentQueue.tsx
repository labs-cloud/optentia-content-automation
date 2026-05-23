import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, STATUS_CONFIG, formatRelativeTime, truncate } from "@/lib/platformUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  CheckSquare,
  Edit3,
  Instagram,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type Post = {
  id: number;
  title: string | null;
  caption: string | null;
  hashtags: string | null;
  platform: string;
  status: string;
  contentType: string;
  contentPillar: string | null;
  aiGenerated: boolean;
  scheduledAt: Date | null;
  createdAt: Date;
  rejectionReason: string | null;
  scriptText: string | null;
};

const STATUS_TABS = [
  { value: "pending_approval", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

export default function ContentQueue() {
  const [activeTab, setActiveTab] = useState("pending_approval");
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [rejectPost, setRejectPost] = useState<Post | null>(null);
  const [schedulePost, setSchedulePost] = useState<Post | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const utils = trpc.useUtils();

  const { data: posts, isLoading } = trpc.posts.list.useQuery({
    status: activeTab,
    limit: 50,
  });

  const approveMutation = trpc.posts.approve.useMutation({
    onSuccess: () => {
      toast.success("Post approved successfully");
      utils.posts.list.invalidate();
      utils.analytics.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.posts.reject.useMutation({
    onSuccess: () => {
      toast.success("Post rejected");
      setRejectPost(null);
      setRejectReason("");
      utils.posts.list.invalidate();
      utils.analytics.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      toast.success("Post updated");
      setEditPost(null);
      utils.posts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const scheduleMutation = trpc.posts.schedulePost.useMutation({
    onSuccess: () => {
      toast.success("Post scheduled");
      setSchedulePost(null);
      utils.posts.list.invalidate();
      utils.analytics.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      utils.posts.list.invalidate();
      utils.analytics.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (post: Post) => {
    setEditPost(post);
    setEditCaption(post.caption ?? "");
    setEditHashtags(post.hashtags ?? "");
    setEditTitle(post.title ?? "");
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            Content Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review, approve, and manage your content pipeline</p>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border/50 h-9 p-1">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs h-7 px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Post List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (posts ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No posts in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts?.map((post) => {
            const cfg = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
            const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG];
            return (
              <Card key={post.id} className="bg-card border-border/50 hover:border-border transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Platform Icon */}
                    <div className={`h-10 w-10 rounded-xl ${cfg?.bgColor} flex items-center justify-center shrink-0 border ${cfg?.borderColor}`}>
                      <span className="text-lg">{cfg?.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium ${cfg?.color}`}>{cfg?.label}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusCfg?.bgColor} ${statusCfg?.color}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${statusCfg?.dotColor}`} />
                          {statusCfg?.label}
                        </div>
                        {post.aiGenerated && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{formatRelativeTime(post.createdAt)}</span>
                      </div>

                      {post.title && (
                        <p className="text-sm font-semibold mb-1">{post.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {truncate(post.caption, 200)}
                      </p>
                      {post.hashtags && (
                        <p className="text-xs text-primary/70 mt-1.5">{truncate(post.hashtags, 100)}</p>
                      )}
                      {post.scheduledAt && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
                          <CalendarDays className="h-3 w-3" />
                          Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                        </div>
                      )}
                      {post.rejectionReason && (
                        <p className="text-xs text-red-400 mt-1.5 bg-red-500/10 px-2 py-1 rounded">
                          Rejected: {post.rejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {post.status === "pending_approval" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => approveMutation.mutate({ id: post.id })}
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                            onClick={() => openEdit(post as Post)}
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => setRejectPost(post as Post)}
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {post.status === "approved" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => {
                              setSchedulePost(post as Post);
                              setScheduleDate("");
                            }}
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            Schedule
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(post as Post)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(post.status === "draft" || post.status === "rejected") && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(post as Post)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteMutation.mutate({ id: post.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPost} onOpenChange={(o) => !o && setEditPost(null)}>
        <DialogContent className="max-w-2xl bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Title / Hook</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Post title or hook..."
                className="bg-muted/30 border-border/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Caption</label>
              <Textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={8}
                className="bg-muted/30 border-border/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Hashtags</label>
              <Input
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                placeholder="#automation #ai #business..."
                className="bg-muted/30 border-border/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPost(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editPost) return;
                updateMutation.mutate({
                  id: editPost.id,
                  title: editTitle,
                  caption: editCaption,
                  hashtags: editHashtags,
                });
              }}
              disabled={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectPost} onOpenChange={(o) => !o && setRejectPost(null)}>
        <DialogContent className="max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Reject Post</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Reason (optional)</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this being rejected?"
              rows={3}
              className="bg-muted/30 border-border/50 resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectPost(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectPost && rejectMutation.mutate({ id: rejectPost.id, reason: rejectReason })}
              disabled={rejectMutation.isPending}
            >
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={!!schedulePost} onOpenChange={(o) => !o && setSchedulePost(null)}>
        <DialogContent className="max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Schedule Post</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Publish Date & Time</label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="bg-muted/30 border-border/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulePost(null)}>Cancel</Button>
            <Button
              onClick={() => schedulePost && scheduleDate && scheduleMutation.mutate({ id: schedulePost.id, scheduledAt: scheduleDate })}
              disabled={scheduleMutation.isPending || !scheduleDate}
            >
              Schedule Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
