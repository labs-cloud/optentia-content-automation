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
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { PremiumCard } from "./PremiumCard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
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
  imageUrl: string | null;
  scheduledAt: Date | string | null;
  createdAt: Date | string;
  rejectionReason: string | null;
  publishError: string | null;
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
};

/**
 * Card-based approval row for the content queue. Primary actions surface per
 * status; everything else lives in the overflow menu.
 */
export function ApprovalCard({ post, actions, busy }: { post: ApprovalPost; actions: ApprovalActions; busy?: boolean }) {
  const platform = PLATFORM_CONFIG[post.platform as Platform];
  const status = STATUS_CONFIG[post.status as PostStatus];
  const manual = isManualPlatform(post.platform);

  return (
    <PremiumCard className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {post.imageUrl && (
          <div className="sm:w-44 shrink-0 bg-muted">
            <img src={post.imageUrl} alt="" className="h-40 sm:h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex-1 p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {platform && (
              <Badge variant="outline" className={`rounded-md text-[11px] ${platform.borderColor} ${platform.color} ${platform.bgColor}`}>
                {platform.icon} {platform.label}
              </Badge>
            )}
            {status && (
              <Badge variant="outline" className={`rounded-md text-[11px] border-0 ${status.bgColor} ${status.color}`}>
                {status.label}
              </Badge>
            )}
            {manual && (
              <Badge variant="outline" className="rounded-md text-[11px] border-dashed text-muted-foreground">
                manual channel
              </Badge>
            )}
            {post.isWinner && (
              <Badge className="rounded-md text-[11px] border-0 bg-yellow-500/15 text-yellow-400">🏆 Winner</Badge>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>

          {post.title && <p className="font-medium text-sm leading-snug mb-1">{post.title}</p>}
          {post.caption && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4">
              {post.caption}
            </p>
          )}
          {post.hashtags && (
            <p className="text-xs text-primary/70 mt-1.5 line-clamp-1">{post.hashtags}</p>
          )}
          {post.rejectionReason && (
            <p className="text-xs text-red-400 mt-2">Rejected: {post.rejectionReason}</p>
          )}
          {post.publishError && (
            <p className="text-xs text-destructive mt-2 break-all">Error: {post.publishError}</p>
          )}

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {post.status === "pending_approval" && actions.onApprove && (
              <Button size="sm" disabled={busy} onClick={() => actions.onApprove!(post)} className="rounded-lg">
                <Check className="h-4 w-4 mr-1" /> Approve
              </Button>
            )}
            {post.status === "pending_approval" && actions.onReject && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.onReject!(post)} className="rounded-lg text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            )}
            {(post.status === "approved" || post.status === "failed") && !manual && actions.onPublish && (
              <Button size="sm" disabled={busy} onClick={() => actions.onPublish!(post)} className="rounded-lg">
                <Send className="h-4 w-4 mr-1" /> Publish now
              </Button>
            )}
            {post.status === "approved" && actions.onSchedule && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.onSchedule!(post)} className="rounded-lg">
                <CalendarClock className="h-4 w-4 mr-1" /> Schedule
              </Button>
            )}
            {actions.onEdit && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => actions.onEdit!(post)} className="rounded-lg">
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="rounded-lg ml-auto" disabled={busy} aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {actions.onRegenerate && (
                  <DropdownMenuItem onClick={() => actions.onRegenerate!(post)} className="cursor-pointer">
                    <RefreshCcw className="h-4 w-4 mr-2" /> Regenerate
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
      </div>
    </PremiumCard>
  );
}
