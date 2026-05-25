import { useRef, useState } from "react";
import {
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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
  imageUrl?: string;
  error?: string;
};

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel serverless body limit

interface Props {
  trigger?: React.ReactNode;
}

/**
 * One-shot composer: caption → publish.
 * By default the server auto-generates a platform-specific viral graphic for
 * each selected platform. Power users can open the "Advanced" section to
 * upload their own image (one image, used for all platforms).
 */
export function InstantPostDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<PlatformKey, boolean>>({
    instagram: false,
    linkedin: false,
    linkedin_personal: false,
    linkedin_company: false,
    facebook: false,
    youtube: false,
  });
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: platforms } = trpc.platforms.list.useQuery();
  const utils = trpc.useUtils();

  const uploadImage = trpc.posts.uploadImage.useMutation({
    onSuccess: ({ url }) => {
      setImageUrl(url);
      toast.success("Image uploaded — will be used for all selected platforms");
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed");
      setImagePreviewSrc(null);
    },
  });

  const generateImageMut = trpc.posts.generateImageForCaption.useMutation({
    onSuccess: ({ url }) => {
      setImageUrl(url);
      setImagePreviewSrc(url);
      toast.success("Image generated");
    },
    onError: (err) => {
      toast.error(err.message || "Image generation failed");
    },
  });

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

  // Show all six possible targets in stable order; disable un-connected ones.
  // Instagram is NOT disabled when no image is attached — server auto-generates.
  const allTargets: PlatformKey[] = [
    "instagram",
    "linkedin_personal",
    "linkedin_company",
    "facebook",
    "youtube",
    "linkedin",
  ];

  const platformOptions = allTargets.map((platform) => {
    const connected = connectedSet.has(platform);
    return {
      platform,
      connected,
      disabled: !connected,
      disabledReason: !connected ? "Not set" : null,
      label:
        PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.label ??
        platform,
      icon: PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.icon ?? "•",
    };
  });

  const selectedList = (Object.entries(selected) as Array<[PlatformKey, boolean]>)
    .filter(([, on]) => on)
    .map(([k]) => k);
  const effectiveSelected = selectedList.filter((p) => {
    const opt = platformOptions.find((o) => o.platform === p);
    return opt && !opt.disabled;
  });

  const busy =
    quickPublish.isPending ||
    uploadImage.isPending ||
    generateImageMut.isPending;

  const canSubmit =
    caption.trim().length > 0 &&
    effectiveSelected.length > 0 &&
    !busy;

  function reset() {
    setCaption("");
    setHashtags("");
    setImageUrl(null);
    setImagePreviewSrc(null);
    setAdvancedOpen(false);
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
    uploadImage.reset();
    generateImageMut.reset();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setResults(null);
    quickPublish.mutate({
      caption: caption.trim(),
      hashtags: hashtags.trim() || undefined,
      imageUrl: imageUrl ?? undefined,
      platforms: effectiveSelected,
    });
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(
        `Image is ${Math.round(file.size / 1024 / 1024)}MB — max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreviewSrc(dataUrl);
      const base64 = dataUrl.split(",")[1] ?? "";
      uploadImage.mutate({ dataBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  function handleGeneratePreview() {
    if (!caption.trim()) {
      toast.error("Type a caption first so the AI knows what to draw");
      return;
    }
    generateImageMut.mutate({ caption: caption.trim() });
  }

  function clearImage() {
    setImageUrl(null);
    setImagePreviewSrc(null);
    uploadImage.reset();
    generateImageMut.reset();
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Instant Post
          </DialogTitle>
          <DialogDescription>
            Caption + pick platforms. The server generates a viral hook-graphic in the right format for each platform and publishes immediately.
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
              rows={5}
              disabled={busy}
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
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="grid grid-cols-2 gap-2">
              {platformOptions.map(({ platform, disabled, disabledReason, label, icon }) => (
                <label
                  key={platform}
                  className={`flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-sm ${
                    disabled || busy
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-accent/40"
                  }`}
                >
                  <Checkbox
                    checked={selected[platform]}
                    disabled={disabled || busy}
                    onCheckedChange={(v) =>
                      setSelected((s) => ({ ...s, [platform]: !!v }))
                    }
                  />
                  <span className="text-base leading-none">{icon}</span>
                  <span className="flex-1 truncate">{label}</span>
                  {disabledReason && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {disabledReason}
                    </span>
                  )}
                </label>
              ))}
            </div>
            {!imageUrl && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <Sparkles className="h-3 w-3 text-primary" />
                AI will auto-generate a hook-graphic in the right format for each platform.
              </p>
            )}
            {imageUrl && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <ImageIcon className="h-3 w-3 text-primary" />
                Your image (below) will be used for all selected platforms.
              </p>
            )}
          </div>

          {/* Advanced: bring your own image */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              disabled={busy}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {advancedOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Advanced — use my own image
            </button>

            {advancedOpen && (
              <div className="space-y-2 pl-4 border-l border-border/50">
                {imagePreviewSrc ? (
                  <div className="relative rounded-md border border-border/50 overflow-hidden bg-muted/20">
                    <img
                      src={imagePreviewSrc}
                      alt="Attached"
                      className="w-full max-h-60 object-contain"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      disabled={busy}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background border border-border/50 disabled:opacity-50"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {uploadImage.isPending && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-xs gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading…
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={handleGeneratePreview}
                        disabled={busy || !caption.trim()}
                      >
                        {generateImageMut.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Preview image
                          </>
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFilePick}
                        className="hidden"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      If you attach an image here it overrides auto-generation and the same image is used for all selected platforms.
                    </p>
                  </>
                )}
              </div>
            )}
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
                          {r.externalPostId ? ` · ${r.externalPostId}` : ""}
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
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
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
