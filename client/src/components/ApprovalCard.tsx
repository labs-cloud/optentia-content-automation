import { PLATFORM_CONFIG, STATUS_CONFIG, formatRelativeTime, isManualPlatform, type PostStatus } from "@/lib/platformUtils";
import type { Platform } from "@shared/platforms";
import {
  CalendarClock,
  Check,
  Copy,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  ZoomIn,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type ApprovalPost = {
  id: number;
  title: string | null;
  caption: string | null;
  hashtags: string | null;
  platform: string;
  status: string;
  contentPillar: string | null;
  contentType: string;
  imageUrl: string | null;
  mediaUrl: string | null;
  scheduledAt: Date | string | null;
  createdAt: Date | string;
  rejectionReason: string | null;
  publishError: string | null;
  externalPostId?: string | null;
  isWinner?: boolean | null;
  aiGenerated: boolean;
};

export type ApprovalActions = {
  onApprove?: (post: ApprovalPost) => void;
  onReject?: (post: ApprovalPost) => void;
  onEdit?: (post: ApprovalPost) => void;
  onSchedule?: (post: ApprovalPost) => void;
  onPublish?: (post: ApprovalPost) => void;
  onRegenerate?: (post: ApprovalPost) => void;
  onVariation?: (post: ApprovalPost) => void;
  onMarkWinner?: (post: ApprovalPost) => void;
  onDelete?: (post: ApprovalPost) => void;
  onPreviewMedia?: (post: ApprovalPost) => void;
};

/** Maps a live platform id onto the prototype's chip / gradient classes. */
function platTag(platform: string): string {
  if (platform === "instagram") return "tag-ig";
  if (platform.startsWith("linkedin")) return "tag-li";
  if (platform === "facebook") return "tag-fb";
  if (platform === "youtube") return "tag-yt";
  return "tag-default";
}
function platGrad(platform: string): string {
  if (platform === "instagram") return "linear-gradient(135deg,#FF8A8A,#C9468B 60%,#7A3FA0)";
  if (platform.startsWith("linkedin")) return "linear-gradient(135deg,#2DD4BF,#2A7A8A 70%,#1E5A66)";
  if (platform === "facebook") return "linear-gradient(135deg,#6AA0F5,#1877F2 70%,#0A3FA0)";
  if (platform === "youtube") return "linear-gradient(135deg,#FFB36B,#E8635B 70%,#B0394F)";
  return "linear-gradient(135deg,#9A7BF0,#5A6BE0 60%,#3A4FB0)";
}
const STATUS_TAG: Record<string, string> = {
  pending_approval: "tag-pending",
  approved: "tag-approved",
  scheduled: "tag-scheduled",
  published: "tag-published",
  rejected: "tag-rejected",
  failed: "tag-failed",
  draft: "tag-default",
};

/**
 * Approval card for the content queue — the prototype's "approval" design,
 * wired to the live post actions. Primary actions surface per status; the rest
 * live in the overflow menu.
 */
export function ApprovalCard({ post, actions, busy }: { post: ApprovalPost; actions: ApprovalActions; busy?: boolean }) {
  const platform = PLATFORM_CONFIG[post.platform as Platform];
  const status = STATUS_CONFIG[post.status as PostStatus];
  const manual = isManualPlatform(post.platform);

  const previewUrl = post.imageUrl ?? post.mediaUrl;

  return (
    <article className="approval">
      <div className="approval-img">
        <button
          type="button"
          className="approval-media-button"
          onClick={() => actions.onPreviewMedia?.(post)}
          disabled={!previewUrl}
          aria-label={previewUrl ? "Open media preview" : "No media attached"}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="" loading="lazy" />
          ) : (
            <div className="grad" style={{ background: platGrad(post.platform) }} />
          )}
          {previewUrl && (
            <span className="approval-media-badge">
              <ZoomIn />
            </span>
          )}
        </button>
      </div>
      <div className="approval-body">
        <div className="approval-chips">
          {platform && (
            <span className={`tag ${platTag(post.platform)}`}>
              {platform.icon} {platform.label}
            </span>
          )}
          {status && <span className={`tag ${STATUS_TAG[post.status] ?? "tag-default"}`}>{status.label}</span>}
          {post.aiGenerated ? (
            <span className="tag tag-ai">
              <Sparkles style={{ width: 11, height: 11 }} /> AI draft
            </span>
          ) : (
            <span className="tag tag-default" style={{ borderStyle: "dashed" }}>
              manual
            </span>
          )}
          {post.isWinner && <span className="tag tag-approved">🏆 Winner</span>}
          <span className="tag-time">{formatRelativeTime(post.createdAt)}</span>
        </div>

        {post.title && <div className="approval-title">{post.title}</div>}
        {post.caption && <div className="approval-caption">{post.caption}</div>}
        {post.hashtags && <div className="approval-tags">{post.hashtags}</div>}
        {post.rejectionReason && (
          <p className="mt-2 text-xs text-[#ff6b6b]">Rejected: {post.rejectionReason}</p>
        )}
        {post.publishError && (
          <p className="mt-2 break-all text-xs text-[#ff6b6b]">Error: {post.publishError}</p>
        )}

        <div className="approval-actions">
          {post.status === "pending_approval" && actions.onApprove && (
            <button className="btn btn-approve btn-sm" disabled={busy} onClick={() => actions.onApprove!(post)}>
              <Check /> Approve
            </button>
          )}
          {post.status === "pending_approval" && actions.onReject && (
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => actions.onReject!(post)}>
              <X /> Reject
            </button>
          )}
          {(post.status === "approved" || post.status === "failed") && !manual && actions.onPublish && (
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => actions.onPublish!(post)}>
              <Send /> {busy ? "Publishing..." : "Publish now"}
            </button>
          )}
          {post.status === "approved" && actions.onSchedule && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => actions.onSchedule!(post)}>
              <CalendarClock /> Schedule
            </button>
          )}
          {actions.onEdit && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => actions.onEdit!(post)}>
              <Pencil /> Edit
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="btn btn-ghost btn-sm spacer" disabled={busy} aria-label="More actions">
                <MoreHorizontal />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {actions.onRegenerate && (
                <DropdownMenuItem onClick={() => actions.onRegenerate!(post)} className="cursor-pointer">
                  <RefreshCcw className="h-4 w-4 mr-2" /> Rework post…
                </DropdownMenuItem>
              )}
              {actions.onVariation && (
                <DropdownMenuItem onClick={() => actions.onVariation!(post)} className="cursor-pointer">
                  <Copy className="h-4 w-4 mr-2" /> Create variation…
                </DropdownMenuItem>
              )}
              {actions.onMarkWinner && (
                <DropdownMenuItem onClick={() => actions.onMarkWinner!(post)} className="cursor-pointer">
                  <Trophy className="h-4 w-4 mr-2" /> {post.isWinner ? "Unmark winner" : "Save as winner"}
                </DropdownMenuItem>
              )}
              {actions.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => actions.onDelete!(post)} className="cursor-pointer text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
