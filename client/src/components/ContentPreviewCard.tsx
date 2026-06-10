import { PLATFORM_CONFIG, STATUS_CONFIG, truncate, type PostStatus } from "@/lib/platformUtils";
import type { Platform } from "@shared/platforms";
import { cn } from "@/lib/utils";
import { PremiumCard } from "./PremiumCard";
import { Badge } from "./ui/badge";

export type ContentPreviewData = {
  id: number;
  title: string | null;
  caption: string | null;
  hashtags: string | null;
  platform: string;
  status: string;
  imageUrl: string | null;
  scheduledAt: Date | string | null;
  isWinner?: boolean | null;
};

/** Compact platform-styled preview of a post — used in campaign detail, dashboard, calendar. */
export function ContentPreviewCard({
  post,
  onClick,
  className,
}: {
  post: ContentPreviewData;
  onClick?: () => void;
  className?: string;
}) {
  const platform = PLATFORM_CONFIG[post.platform as Platform];
  const status = STATUS_CONFIG[post.status as PostStatus];

  return (
    <PremiumCard interactive={Boolean(onClick)} onClick={onClick} className={cn("overflow-hidden", className)}>
      {post.imageUrl && (
        <div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
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
          {post.isWinner && (
            <Badge className="rounded-md text-[11px] border-0 bg-yellow-500/15 text-yellow-400">🏆 Winner</Badge>
          )}
        </div>
        {post.title && <p className="text-sm font-medium leading-snug">{truncate(post.title, 90)}</p>}
        {post.caption && (
          <p className="text-xs text-muted-foreground leading-relaxed">{truncate(post.caption, 140)}</p>
        )}
        {post.scheduledAt && (
          <p className="text-[11px] text-muted-foreground/70">
            {new Date(post.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </PremiumCard>
  );
}
