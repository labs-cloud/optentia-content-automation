import { useState } from "react";
import { Zap, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { trpc } from "@/lib/trpc";

type PlatformKey =
  | "instagram"
  | "linkedin"
  | "linkedin_personal"
  | "linkedin_company"
  | "facebook"
  | "youtube";

type PublishResult = {
  platform: string;
  success: boolean;
  postId?: number;
  externalPostId?: string;
  error?: string;
};

interface Props {
  /**
   * Optional render-prop for the trigger. If omitted, a default "Instant Post"
   * button is rendered.
   */
  trigger?: React.ReactNode;
}

/**
 * One-shot composer: type a caption, pick the platforms, hit publish — no
 * review queue, no schedule. Server-side this calls posts.quickPublish, which
 * creates an "approved" post per platform and immediately runs it through the
 * platform publisher.
 */
export function InstantPostDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selected, setSelected] = useState<Record<PlatformKey, boolean>>({
    instagram: false,
    linkedin: false,
    linkedin_personal: false,
    linkedin_company: false,
    facebook: false,
    youtube: false,
  });
  const [results, setResults] = useState<PublishResult[] | null>(null);

  const { data: platforms } = trpc.platforms.list.useQuery();
  const utils = trpc.useUtils();
  const quickPublish = trpc.posts.quickPublish.useMutation({
    onSuccess: (data) => {
      setResults(data);
      utils.analytics.summary.invalidate();
      utils.analytics.byPlatform.invalidate();
      utils.analytics.recentPosts.invalidate();
      utils.posts.pendingApproval.invalidate();
      const failures = data.filter((r) => !r.success);
      if (failures.length === 0) {
        toast.success(
          `Published to ${data.length} platform${data.length === 1 ? "" : "s"}`,
        );
      } else if (failures.length === data.length) {
        toast.error("All platforms failed — see details below");
      } else {
        toast.warning(
          `${data.length - failures.length}/${data.length} published, ${failures.length} failed`,
        );
      }
    },
    onError: (err) => {
      toast.error(err.message || "Publish failed");
    },
  });

  const connectedSet = new Set(
    (platforms ?? []).filter((p) => p.status === "connected").map((p) => p.platform),
  );

  // Always show the six possible targets so the dropdown order is stable, but
  // disable platforms the user hasn't connected yet.
  const allTargets: PlatformKey[] = [
    "instagram",
    "linkedin_personal",
    "linkedin_company",
    "facebook",
    "youtube",
    "linkedin",
  ];

  const platformOptions = allTargets.map((platform) => ({
    platform,
    connected: connectedSet.has(platform),
    label:
      PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.label ??
      platform,
    icon: PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.icon ?? "•",
  }));

  const selectedList = (Object.entries(selected) as Array<[PlatformKey, boolean]>)
    .filter(([, on]) => on)
    .map(([k]) => k);
  const canSubmit =
    caption.trim().length > 0 &&
    selectedList.length > 0 &&
    !quickPublish.isPending;

  function reset() {
    setCaption("");
    setHashtags("");
    setSelected({
      instagram: false,
      linkedin: false,
      linkedin_personal: false,
      linkedin_company: false,
      facebook: false,
      youtube: false,
    });
    setResults(null);
    quickPublish.reset();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setResults(null);
    quickPublish.mutate({
      caption: caption.trim(),
      hashtags: hashtags.trim() || undefined,
      platforms: selectedList,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary" className="gap-2">
            <Zap className="h-4 w-4" />
            Instant Post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Instant Post
          </DialogTitle>
          <DialogDescription>
            Type a caption, pick the platforms, publish now — no review, no schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instant-caption">Caption</Label>
            <Textarea
              id="instant-caption"
              placeholder="What do you want to say?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              disabled={quickPublish.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instant-hashtags">
              Hashtags <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="instant-hashtags"
              placeholder="#ai #automation #optentia"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              disabled={quickPublish.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="grid grid-cols-2 gap-2">
              {platformOptions.map(({ platform, connected, label, icon }) => {
                const disabled = !connected || quickPublish.isPending;
                return (
                  <label
                    key={platform}
                    className={`flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-sm ${
                      disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-accent/40"
                    }`}
                  >
                    <Checkbox
                      checked={selected[platform]}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        setSelected((s) => ({ ...s, [platform]: !!v }))
                      }
                    />
                    <span className="text-base leading-none">{icon}</span>
                    <span className="flex-1 truncate">{label}</span>
                    {!connected && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Not set
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {results && results.length > 0 && (
            <div className="space-y-1.5 rounded-md border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Results
              </p>
              {results.map((r) => {
                const label =
                  PLATFORM_CONFIG[r.platform as keyof typeof PLATFORM_CONFIG]
                    ?.label ?? r.platform;
                return (
                  <div
                    key={r.platform}
                    className="flex items-start gap-2 text-sm"
                  >
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{label}</p>
                      {r.success ? (
                        <p className="text-xs text-muted-foreground">
                          Published
                          {r.externalPostId
                            ? ` · ${r.externalPostId}`
                            : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive break-words">
                          {r.error ?? "Unknown error"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={quickPublish.isPending}
          >
            Close
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-2 glow-primary"
          >
            {quickPublish.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Publish now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InstantPostDialog;
