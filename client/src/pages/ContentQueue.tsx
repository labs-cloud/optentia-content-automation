import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ApprovalCard, type ApprovalPost } from "@/components/ApprovalCard";
import { EmptyState } from "@/components/EmptyState";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { PLATFORMS, type Platform } from "@shared/platforms";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { CheckSquare, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";

const STATUS_TABS = [
  { value: "pending_approval", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

const REWORK_STRATEGIES = [
  { value: "edit_existing", label: "Edit existing copy" },
  { value: "fresh_angle", label: "New angle" },
  { value: "photo_story", label: "Story from photo" },
  { value: "practical_education", label: "Practical education" },
  { value: "stronger_cta", label: "Stronger CTA" },
  { value: "contrarian", label: "Contrarian take" },
] as const;

export default function ContentQueue() {
  const [, setLocation] = useLocation();
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();

  const [activeTab, setActiveTab] = useState("pending_approval");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [editPost, setEditPost] = useState<ApprovalPost | null>(null);
  const [rejectPost, setRejectPost] = useState<ApprovalPost | null>(null);
  const [schedulePost, setSchedulePost] = useState<ApprovalPost | null>(null);
  const [variationPost, setVariationPost] = useState<ApprovalPost | null>(null);
  const [reworkPost, setReworkPost] = useState<ApprovalPost | null>(null);
  const [previewPost, setPreviewPost] = useState<ApprovalPost | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [variationPlatform, setVariationPlatform] = useState<Platform>("instagram");
  const [reworkStrategy, setReworkStrategy] = useState<(typeof REWORK_STRATEGIES)[number]["value"]>("fresh_angle");
  const [reworkInstructions, setReworkInstructions] = useState("");
  const [reworkAvoidInstructions, setReworkAvoidInstructions] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: posts, isLoading } = trpc.posts.list.useQuery(
    {
      clientId,
      status: activeTab,
      platform: platformFilter === "all" ? undefined : platformFilter,
      campaignId: campaignFilter === "all" ? undefined : Number(campaignFilter),
      limit: 50,
    },
    { enabled },
  );

  const { data: campaigns } = trpc.campaigns.getCampaigns.useQuery({ clientId }, { enabled });
  const { data: previewAssets } = trpc.media.forPost.useQuery(
    { postId: previewPost?.id ?? 0 },
    { enabled: Boolean(previewPost?.id && previewPost.contentType === "carousel") },
  );

  const previewUrls = previewPost
    ? [
        previewPost.imageUrl ?? previewPost.mediaUrl,
        ...(previewPost.contentType === "carousel" ? (previewAssets ?? []).map((asset) => asset.url) : []),
      ].filter((url, index, urls): url is string => Boolean(url) && urls.indexOf(url) === index)
    : [];
  const activePreviewUrl = previewUrls[previewIndex] ?? previewUrls[0] ?? null;
  const activePreviewIsVideo = Boolean(
    activePreviewUrl && (previewPost?.contentType === "reel" || previewPost?.contentType === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(activePreviewUrl)),
  );

  const invalidate = () => {
    utils.posts.invalidate();
    utils.analytics.invalidate();
  };

  const approveMutation = trpc.posts.approve.useMutation({
    onSuccess: () => {
      toast.success("Post approved — ready to schedule or publish");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.posts.reject.useMutation({
    onSuccess: () => {
      toast.success("Post rejected");
      setRejectPost(null);
      setRejectReason("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      toast.success("Post updated");
      setEditPost(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const scheduleMutation = trpc.posts.schedulePost.useMutation({
    onSuccess: () => {
      toast.success("Post scheduled");
      setSchedulePost(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const publishNowMutation = trpc.posts.publishNow.useMutation({
    onSuccess: () => {
      toast.success("Post published successfully!");
      setPublishingId(null);
      invalidate();
    },
    onError: (e) => {
      toast.error(`Publish failed: ${e.message}`);
      setPublishingId(null);
    },
  });

  const markWinnerMutation = trpc.posts.markWinner.useMutation({
    onSuccess: (post) => {
      toast.success(post?.isWinner ? "Saved as winner — the AI will learn from it" : "Winner unmarked");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const variationMutation = trpc.posts.generateVariation.useMutation({
    onSuccess: () => {
      toast.success("Fresh take drafted — see the Drafts tab");
      setVariationPost(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const regenerateCaptionMutation = trpc.posts.regenerateCaption.useMutation({
    onSuccess: () => {
      toast.success("Post reworked");
      setReworkPost(null);
      setReworkInstructions("");
      setReworkAvoidInstructions("");
      setRegeneratingId(null);
      invalidate();
    },
    onError: (e) => {
      toast.error(e.message);
      setRegeneratingId(null);
    },
  });

  const openEdit = (post: ApprovalPost) => {
    setEditPost(post);
    setEditCaption(post.caption ?? "");
    setEditHashtags(post.hashtags ?? "");
    setEditTitle(post.title ?? "");
  };

  const openVariation = (post: ApprovalPost) => {
    setVariationPost(post);
    setVariationPlatform((post.platform === "instagram" ? "linkedin_personal" : "instagram") as Platform);
  };

  const openRework = (post: ApprovalPost) => {
    setReworkPost(post);
    setReworkStrategy("edit_existing");
    setReworkInstructions("");
    setReworkAvoidInstructions("");
  };

  const openPreview = (post: ApprovalPost) => {
    setPreviewPost(post);
    setPreviewIndex(0);
  };

  const handlePublishNow = (post: ApprovalPost) => {
    setPublishingId(post.id);
    publishNowMutation.mutate({ id: post.id });
  };

  const handleReworkPost = (post: ApprovalPost) => {
    setRegeneratingId(post.id);
    regenerateCaptionMutation.mutate({
      id: post.id,
      strategy: reworkStrategy,
      instructions: reworkInstructions.trim() || undefined,
      avoidInstructions: reworkAvoidInstructions.trim() || undefined,
    });
  };

  const handleDelete = (post: ApprovalPost) => {
    if (confirm("Delete this post permanently?")) {
      deleteMutation.mutate({ id: post.id });
    }
  };

  if (!enabled) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Users}
          title="No client selected"
          description="Pick or create a client to review its content queue."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  return (
    <div className="container py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="topbar">
        <div>
          <div className="eyebrow">Operate · {activeClient?.name}</div>
          <h1 className="page-h1">Approval queue</h1>
          <div className="topbar-pill">
            <span className="pulse" /> {(posts ?? []).length} post{(posts ?? []).length === 1 ? "" : "s"} in view
          </div>
        </div>
        <div className="topbar-actions">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[170px] rounded-xl">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[170px] rounded-xl">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {(campaigns ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="filters">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`filter${activeTab === tab.value ? " active" : ""}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Post List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (posts ?? []).length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No posts in this category"
          description="Generate content or adjust the filters above."
          actionLabel="Generate a post"
          onAction={() => setLocation("/generate")}
        />
      ) : (
        <StaggerList className="queue-list">
          {posts?.map((post) => (
            <StaggerItem key={post.id}>
              <ApprovalCard
                post={post}
                busy={publishingId === post.id || regeneratingId === post.id}
                actions={{
                  onApprove: (p) => approveMutation.mutate({ id: p.id }),
                  onReject: (p) => setRejectPost(p),
                  onEdit: openEdit,
                  onSchedule: (p) => {
                    setSchedulePost(p);
                    setScheduleDate("");
                  },
                  onPublish: handlePublishNow,
                  onRegenerate: openRework,
                  onVariation: openVariation,
                  onMarkWinner: (p) => markWinnerMutation.mutate({ id: p.id, isWinner: !p.isWinner }),
                  onDelete: handleDelete,
                  onPreviewMedia: openPreview,
                }}
              />
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {/* Media Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display">{previewPost?.title ?? "Media preview"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border border-border/50 bg-black">
              {activePreviewUrl ? (
                activePreviewIsVideo ? (
                  <video
                    src={activePreviewUrl}
                    controls
                    className="max-h-[70vh] w-full bg-black object-contain"
                  />
                ) : (
                  <img
                    src={activePreviewUrl}
                    alt=""
                    className="max-h-[70vh] w-full object-contain"
                  />
                )
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No media attached.
                </div>
              )}
            </div>
            {previewUrls.length > 1 && (
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewIndex((index) => Math.max(0, index - 1))}
                  disabled={previewIndex === 0}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex min-w-0 flex-1 justify-center gap-2 overflow-x-auto">
                  {previewUrls.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setPreviewIndex(index)}
                      className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border ${index === previewIndex ? "border-primary" : "border-border/50"}`}
                      aria-label={`Open slide ${index + 1}`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewIndex((index) => Math.min(previewUrls.length - 1, index + 1))}
                  disabled={previewIndex >= previewUrls.length - 1}
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {activePreviewUrl && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => window.open(activePreviewUrl, "_blank")}>
                  Open original
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPost} onOpenChange={(o) => !o && setEditPost(null)}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="font-display">Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto px-6 pb-2">
            {editPost?.imageUrl && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Generated Image</label>
                <img src={editPost.imageUrl} alt="Generated" className="h-40 w-40 object-cover rounded-lg border border-border/50" />
              </div>
            )}
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
          <DialogFooter className="px-6 pb-6">
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
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectPost} onOpenChange={(o) => !o && setRejectPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Reject Post</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Reason (optional)</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this being rejected? The AI learns from this."
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
        <DialogContent className="max-w-md">
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
            <p className="text-xs text-muted-foreground mt-2">The post will be automatically published at this time by the scheduler.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulePost(null)}>Cancel</Button>
            <Button
              onClick={() =>
                schedulePost &&
                scheduleDate &&
                scheduleMutation.mutate({ id: schedulePost.id, scheduledAt: new Date(scheduleDate).toISOString() })
              }
              disabled={scheduleMutation.isPending || !scheduleDate}
            >
              Schedule Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variation Dialog */}
      <Dialog open={!!reworkPost} onOpenChange={(o) => !o && !regenerateCaptionMutation.isPending && setReworkPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Rework post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Mode</label>
              <Select value={reworkStrategy} onValueChange={(v) => setReworkStrategy(v as typeof reworkStrategy)}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REWORK_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Direct commands</label>
              <Textarea
                value={reworkInstructions}
                onChange={(e) => setReworkInstructions(e.target.value)}
                rows={4}
                placeholder="Example: make it shorter, keep the same idea, make the first line stronger, remove repetition..."
                className="bg-muted/30 border-border/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">What not to do</label>
              <Textarea
                value={reworkAvoidInstructions}
                onChange={(e) => setReworkAvoidInstructions(e.target.value)}
                rows={3}
                placeholder="Example: do not change the angle, do not add emojis, do not make it salesy, do not remove the attorney advertising disclaimer..."
                className="bg-muted/30 border-border/50 resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Edit existing copy preserves the idea and applies your commands. Other modes can create a new path for the same media. Media, status, platform, and approval flow stay unchanged.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReworkPost(null)} disabled={regenerateCaptionMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => reworkPost && handleReworkPost(reworkPost)}
              disabled={regenerateCaptionMutation.isPending}
            >
              {regenerateCaptionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Rework Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variation Dialog */}
      <Dialog open={!!variationPost} onOpenChange={(o) => !o && !variationMutation.isPending && setVariationPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Create Variation</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Target platform</label>
            <Select value={variationPlatform} onValueChange={(v) => setVariationPlatform(v as Platform)}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              The AI keeps the core idea and rewrites it for the chosen channel. The result lands in Drafts.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariationPost(null)} disabled={variationMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                variationPost &&
                variationMutation.mutate({ id: variationPost.id, targetPlatform: variationPlatform })
              }
              disabled={variationMutation.isPending}
            >
              {variationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
