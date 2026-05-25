import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap,
  Sparkles,
  ChevronLeft,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Loader2,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { trpc } from "@/lib/trpc";

type PlatformKey = "instagram" | "linkedin_personal" | "linkedin_company" | "facebook" | "youtube";

interface CaptionIdea {
  tone: string;
  caption: string;
  hashtags: string;
}

interface VisualConcept {
  id: string;
  styleName: string;
  description: string;
  colors: string[];
  imagePrompt: string;
}

type Step = "topic" | "caption" | "concept" | "preview" | "publish";

interface Props {
  trigger?: ReactNode;
}

const PLATFORM_KEYS: PlatformKey[] = [
  "instagram",
  "linkedin_personal",
  "linkedin_company",
  "facebook",
  "youtube",
];

const VARIATION_HINTS = [
  "Use a different layout — try an asymmetric, off-center composition.",
  "Bolder, more saturated accent color from the palette. Push contrast.",
  "Try a more dramatic camera angle or unexpected framing.",
  "Make the main hook text much larger and more dominant on the canvas.",
  "Use more negative space and a quieter, minimalist composition.",
  "Switch the background to a textured or gradient backdrop.",
  "Stack the text vertically instead of horizontally.",
  "Try a more editorial, magazine-cover feel.",
];

export function InstantPostDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("topic");

  // Step 1: topic
  const [topic, setTopic] = useState("");

  // Step 2: captions
  const [captionIdeas, setCaptionIdeas] = useState<CaptionIdea[]>([]);
  const [chosenCaption, setChosenCaption] = useState<CaptionIdea | null>(null);

  // Step 3: concepts
  const [visualConcepts, setVisualConcepts] = useState<VisualConcept[]>([]);
  const [chosenConcept, setChosenConcept] = useState<VisualConcept | null>(null);

  // Step 4: preview + variation tracker
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [variationIdx, setVariationIdx] = useState(0);

  // Step 5: editable caption + platforms
  const [editedCaption, setEditedCaption] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");
  const [selected, setSelected] = useState<Record<PlatformKey, boolean>>({
    instagram: true,
    linkedin_personal: false,
    linkedin_company: false,
    facebook: false,
    youtube: false,
  });

  const utils = trpc.useUtils();

  const generateCaptionsMut = trpc.posts.generateCaptionIdeas.useMutation({
    onSuccess: (data) => {
      setCaptionIdeas(data.ideas ?? []);
      setStep("caption");
    },
    onError: (e) => toast.error(`Couldn't generate caption ideas: ${e.message}`),
  });

  const generateConceptsMut = trpc.posts.generateVisualConcepts.useMutation({
    onSuccess: (data) => {
      setVisualConcepts(data.concepts ?? []);
      setStep("concept");
    },
    onError: (e) => toast.error(`Couldn't generate visual concepts: ${e.message}`),
  });

  const generateImageMut = trpc.posts.generateImageFromConcept.useMutation({
    onSuccess: (data) => {
      setPreviewUrl(data.url);
      setStep("preview");
    },
    onError: (e) => toast.error(`Image generation failed: ${e.message}`),
  });

  const quickPublishMut = trpc.posts.quickPublish.useMutation({
    onSuccess: (data) => {
      const succeeded = (data.results ?? []).filter((r: { success: boolean }) => r.success);
      const failed = (data.results ?? []).filter((r: { success: boolean }) => !r.success);
      if (succeeded.length > 0) {
        toast.success(`Published to ${succeeded.length} platform${succeeded.length > 1 ? "s" : ""}`);
      }
      if (failed.length > 0) {
        toast.error(
          `Failed on ${failed.length}: ${failed
            .map((f: { platform: string; error?: string }) => `${f.platform} (${f.error ?? "unknown"})`)
            .join(", ")}`,
        );
      }
      void utils.posts.list.invalidate();
      if (failed.length === 0) {
        resetAndClose();
      }
    },
    onError: (e) => toast.error(`Publish failed: ${e.message}`),
  });

  function resetAndClose() {
    setOpen(false);
    setTimeout(() => {
      setStep("topic");
      setTopic("");
      setCaptionIdeas([]);
      setChosenCaption(null);
      setVisualConcepts([]);
      setChosenConcept(null);
      setPreviewUrl(null);
      setVariationIdx(0);
      setEditedCaption("");
      setEditedHashtags("");
    }, 200);
  }

  const busy =
    generateCaptionsMut.isPending ||
    generateConceptsMut.isPending ||
    generateImageMut.isPending ||
    quickPublishMut.isPending;

  function handleGenerateCaptions() {
    if (!topic.trim()) {
      toast.error("Add a topic first");
      return;
    }
    generateCaptionsMut.mutate({ topic: topic.trim() });
  }

  function handlePickCaption(idea: CaptionIdea) {
    setChosenCaption(idea);
    setEditedCaption(idea.caption);
    setEditedHashtags(idea.hashtags);
    generateConceptsMut.mutate({ caption: idea.caption });
  }

  function handlePickConcept(concept: VisualConcept) {
    setChosenConcept(concept);
    setVariationIdx(0);
    generateImageMut.mutate({ imagePrompt: concept.imagePrompt, size: "1024x1024" });
  }

  function handleRegeneratePreview() {
    if (!chosenConcept) return;
    setPreviewUrl(null);
    const nextIdx = variationIdx + 1;
    setVariationIdx(nextIdx);
    const hint = VARIATION_HINTS[nextIdx % VARIATION_HINTS.length];
    generateImageMut.mutate({
      imagePrompt: `${chosenConcept.imagePrompt}\n\nVariation note: ${hint}`,
      size: "1024x1024",
    });
  }

  function handleTryDifferentConcepts() {
    if (!chosenCaption) return;
    setPreviewUrl(null);
    setChosenConcept(null);
    setVisualConcepts([]);
    generateConceptsMut.mutate({ caption: chosenCaption.caption });
  }

  function handleAcceptPreview() {
    setStep("publish");
  }

  function handlePublish() {
    if (!editedCaption.trim() || !previewUrl) return;
    const platforms = PLATFORM_KEYS.filter((p) => selected[p]);
    if (platforms.length === 0) {
      toast.error("Pick at least one platform");
      return;
    }
    quickPublishMut.mutate({
      caption: editedCaption.trim(),
      hashtags: editedHashtags.trim() || undefined,
      imageUrl: previewUrl,
      platforms,
    });
  }

  function goBack() {
    if (step === "caption") setStep("topic");
    else if (step === "concept") setStep("caption");
    else if (step === "preview") setStep("concept");
    else if (step === "publish") setStep("preview");
  }

  const stepNumber = { topic: 1, caption: 2, concept: 3, preview: 4, publish: 5 }[step];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetAndClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary" className="gap-2">
            <Zap className="size-4" />
            Instant Post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            Instant Post
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              Step {stepNumber} of 5
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === "topic" && "What's the post about?"}
            {step === "caption" && "Pick a caption angle."}
            {step === "concept" && "Pick a visual concept."}
            {step === "preview" && "Preview, regenerate, or try different concepts."}
            {step === "publish" && "Edit caption, pick platforms, publish."}
          </DialogDescription>
        </DialogHeader>

        {step === "topic" && (
          <div className="space-y-3">
            <Label htmlFor="topic">Topic or angle</Label>
            <Textarea
              id="topic"
              placeholder="e.g. how AI agents handle the messy middle of running a business"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Optentia will generate 3 caption angles from this. Refine after.
            </p>
          </div>
        )}

        {step === "caption" && (
          <div className="space-y-3">
            {captionIdeas.map((idea, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePickCaption(idea)}
                disabled={busy}
                className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-accent/30 transition p-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {idea.tone}
                  </span>
                </div>
                <p className="text-sm leading-snug whitespace-pre-wrap line-clamp-6">
                  {idea.caption}
                </p>
                {idea.hashtags && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    {idea.hashtags}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {step === "concept" && (
          <div className="space-y-3">
            {visualConcepts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handlePickConcept(c)}
                disabled={busy}
                className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-accent/30 transition p-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex gap-1">
                    {c.colors.slice(0, 3).map((hex, idx) => (
                      <span
                        key={idx}
                        className="size-5 rounded border border-border/40"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">{c.styleName}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-snug">{c.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            {previewUrl ? (
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
                <img
                  src={previewUrl}
                  alt="Generated preview"
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-muted/30 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {chosenConcept && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{chosenConcept.styleName}</span> ·{" "}
                {chosenConcept.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegeneratePreview}
                disabled={busy || !chosenConcept}
                className="gap-2"
              >
                <RefreshCw className="size-4" />
                Regenerate (variation)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTryDifferentConcepts}
                disabled={busy || !chosenCaption}
                className="gap-2"
              >
                <Shuffle className="size-4" />
                Different concepts
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptPreview}
                disabled={busy || !previewUrl}
                className="gap-2 ml-auto"
              >
                <Check className="size-4" />
                Use this image
              </Button>
            </div>
          </div>
        )}

        {step === "publish" && (
          <div className="space-y-4">
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
                <img src={previewUrl} alt="Final" className="w-full h-auto max-h-48 object-cover" />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="edit-caption" className="text-xs">
                Caption (edit freely)
              </Label>
              <Textarea
                id="edit-caption"
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={6}
                className="text-xs leading-snug resize-y"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-hashtags" className="text-xs">
                Hashtags
              </Label>
              <Textarea
                id="edit-hashtags"
                value={editedHashtags}
                onChange={(e) => setEditedHashtags(e.target.value)}
                rows={2}
                className="text-xs resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_KEYS.map((p) => {
                  const cfg = PLATFORM_CONFIG[p];
                  if (!cfg) return null;
                  return (
                    <label
                      key={p}
                      className="flex items-center gap-2 rounded-md border border-border bg-card p-2 cursor-pointer hover:bg-accent/30"
                    >
                      <Checkbox
                        checked={selected[p]}
                        onCheckedChange={(v) =>
                          setSelected((s) => ({ ...s, [p]: Boolean(v) }))
                        }
                      />
                      <span className="text-sm">
                        {cfg.icon} {cfg.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step !== "topic" && (
            <Button variant="ghost" onClick={goBack} disabled={busy} className="gap-2">
              <ChevronLeft className="size-4" />
              Back
            </Button>
          )}
          {step === "topic" && (
            <Button
              onClick={handleGenerateCaptions}
              disabled={busy || !topic.trim()}
              className="gap-2 ml-auto"
            >
              {generateCaptionsMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate caption ideas
            </Button>
          )}
          {step === "caption" && generateConceptsMut.isPending && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Generating visual concepts…
            </div>
          )}
          {step === "concept" && generateImageMut.isPending && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Generating image…
            </div>
          )}
          {step === "publish" && (
            <Button
              onClick={handlePublish}
              disabled={busy || !previewUrl || !editedCaption.trim()}
              className="gap-2 ml-auto"
            >
              {quickPublishMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageIcon className="size-4" />
              )}
              Publish now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InstantPostDialog;
