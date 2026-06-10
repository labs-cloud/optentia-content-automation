import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, CONTENT_PILLARS } from "@/lib/platformUtils";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  ChevronLeft,
  RefreshCw,
  Check,
  Send,
  FileText,
  Briefcase,
} from "lucide-react";
import { useLocation } from "wouter";

type Platform = "instagram" | "linkedin_personal" | "linkedin_company" | "facebook" | "youtube";
type Pillar = "strong_opinion" | "practical_education" | "documentary" | "direct_promotion";

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

type Step = "settings" | "caption" | "concept" | "preview" | "confirm";

const PLATFORM_KEYS: Platform[] = [
  "instagram",
  "linkedin_personal",
  "linkedin_company",
  "facebook",
  "youtube",
];

const pillarConfig = (p: Pillar) => CONTENT_PILLARS.find((x) => x.value === p);

export default function AIGenerator() {
  const [, setLocation] = useLocation();
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const [step, setStep] = useState<Step>("settings");

  // Step 1: settings
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "instagram",
    "linkedin_personal",
    "linkedin_company",
  ]);
  const [pillar, setPillar] = useState<Pillar>("strong_opinion");
  const [topic, setTopic] = useState("");
  const [skipApproval, setSkipApproval] = useState(false);

  // Step 2: captions
  const [captionIdeas, setCaptionIdeas] = useState<CaptionIdea[]>([]);
  const [chosenCaption, setChosenCaption] = useState<CaptionIdea | null>(null);

  // Step 3: concepts
  const [visualConcepts, setVisualConcepts] = useState<VisualConcept[]>([]);
  const [chosenConcept, setChosenConcept] = useState<VisualConcept | null>(null);

  // Step 4: preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const captionsMut = trpc.posts.generateCaptionIdeas.useMutation({
    onSuccess: (data) => {
      setCaptionIdeas(data.ideas ?? []);
      setStep("caption");
    },
    onError: (e) => toast.error(`Couldn't generate caption ideas: ${e.message}`),
  });

  const conceptsMut = trpc.posts.generateVisualConcepts.useMutation({
    onSuccess: (data) => {
      setVisualConcepts(data.concepts ?? []);
      setStep("concept");
    },
    onError: (e) => toast.error(`Couldn't generate visual concepts: ${e.message}`),
  });

  const imageMut = trpc.posts.generateImageFromConcept.useMutation({
    onSuccess: (data) => {
      setPreviewUrl(data.url);
      setStep("preview");
    },
    onError: (e) => toast.error(`Image generation failed: ${e.message}`),
  });

  const finalizeMut = trpc.posts.createFromWizard.useMutation({
    onSuccess: (data) => {
      const n = data.results?.length ?? 0;
      const dest = skipApproval ? "drafts" : "approval queue";
      toast.success(`Saved ${n} post${n > 1 ? "s" : ""} to ${dest}`);
      void utils.posts.list.invalidate();
      setLocation("/queue");
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  const busy =
    captionsMut.isPending ||
    conceptsMut.isPending ||
    imageMut.isPending ||
    finalizeMut.isPending;

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((curr) =>
      curr.includes(p) ? curr.filter((x) => x !== p) : [...curr, p]
    );
  };

  const handleGenerateCaptions = () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Pick at least one platform");
      return;
    }
    const pCfg = pillarConfig(pillar);
    const enrichedTopic = topic.trim()
      ? `${topic.trim()}\n\nContent pillar: ${pCfg?.label ?? pillar} — ${pCfg?.description ?? ""}`
      : `${pCfg?.label ?? pillar} — ${pCfg?.description ?? ""}`;
    captionsMut.mutate({ clientId, topic: enrichedTopic, platform: selectedPlatforms[0] });
  };

  const handlePickCaption = (idea: CaptionIdea) => {
    setChosenCaption(idea);
    conceptsMut.mutate({ clientId, caption: idea.caption });
  };

  const handlePickConcept = (c: VisualConcept) => {
    setChosenConcept(c);
    imageMut.mutate({ imagePrompt: c.imagePrompt, size: "1024x1024" });
  };

  const handleRegenerate = () => {
    if (!chosenConcept) return;
    setPreviewUrl(null);
    imageMut.mutate({ imagePrompt: chosenConcept.imagePrompt, size: "1024x1024" });
  };

  const handleFinalize = () => {
    if (!chosenCaption || !previewUrl) return;
    finalizeMut.mutate({
      clientId,
      caption: chosenCaption.caption,
      hashtags: chosenCaption.hashtags,
      imageUrl: previewUrl,
      platforms: selectedPlatforms,
      pillar,
      status: skipApproval ? "draft" : "pending_approval",
    });
  };

  const goBack = () => {
    if (step === "caption") setStep("settings");
    else if (step === "concept") setStep("caption");
    else if (step === "preview") setStep("concept");
    else if (step === "confirm") setStep("preview");
  };

  const stepNumber = { settings: 1, caption: 2, concept: 3, preview: 4, confirm: 5 }[step];

  if (!enabled) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Select a client workspace to generate on-brand content."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="size-7 text-primary" />
            AI Content Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generating for {activeClient?.name} — topic → caption → visual concept → image → publish
          </p>
        </div>
        <div className="text-sm text-muted-foreground">Step {stepNumber} of 5</div>
      </div>

      {/* Step 1: Settings */}
      {step === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Target Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORM_KEYS.map((p) => {
                  const cfg = PLATFORM_CONFIG[p];
                  if (!cfg) return null;
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`text-left rounded-lg border p-4 transition ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {cfg.icon} {cfg.label}
                        </span>
                        {active && <Check className="size-4 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label htmlFor="skip-approval">Skip approval queue</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Save as draft instead of pending review
                  </p>
                </div>
                <Switch
                  id="skip-approval"
                  checked={skipApproval}
                  onCheckedChange={setSkipApproval}
                />
              </div>
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"}{" "}
                selected — will create {selectedPlatforms.length} post
                {selectedPlatforms.length === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Content Pillar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {CONTENT_PILLARS.map((p) => {
                  const active = pillar === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPillar(p.value as Pillar)}
                      className={`text-left rounded-lg border p-4 transition ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{p.label}</span>
                        {active && <Check className="size-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Topic or Angle{" "}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g. 'Why most businesses fail at AI implementation' or 'The 3-step CRM automation workflow'"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Leave blank and AI will pick a topic aligned with the pillar.
              </p>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 flex justify-end">
            <Button
              size="lg"
              onClick={handleGenerateCaptions}
              disabled={busy || selectedPlatforms.length === 0}
              className="gap-2"
            >
              {captionsMut.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
              Generate caption ideas
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Caption */}
      {step === "caption" && (
        <Card>
          <CardHeader>
            <CardTitle>Pick a caption angle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                <p className="text-sm leading-snug whitespace-pre-wrap line-clamp-8">
                  {idea.caption}
                </p>
                {idea.hashtags && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    {idea.hashtags}
                  </p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Concept */}
      {step === "concept" && (
        <Card>
          <CardHeader>
            <CardTitle>Pick a visual concept</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewUrl ? (
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30 max-w-md mx-auto">
                <img
                  src={previewUrl}
                  alt="Generated preview"
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square max-w-md mx-auto rounded-lg bg-muted/30 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {chosenConcept && (
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-medium">{chosenConcept.styleName}</span> ·{" "}
                {chosenConcept.description}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={busy || !chosenConcept}
                className="gap-2"
              >
                <RefreshCw className="size-4" />
                Regenerate
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={busy || !previewUrl}
                className="gap-2"
              >
                <Check className="size-4" />
                Use this image
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirm */}
      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm and save</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img src={previewUrl} alt="Final" className="w-full h-auto object-cover" />
                </div>
              )}
              <div className="space-y-3">
                {chosenCaption && (
                  <div className="rounded-md bg-muted/30 p-3 max-h-48 overflow-y-auto">
                    <p className="text-xs whitespace-pre-wrap leading-snug">
                      {chosenCaption.caption}
                    </p>
                    {chosenCaption.hashtags && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {chosenCaption.hashtags}
                      </p>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Platforms:</span>{" "}
                    {selectedPlatforms
                      .map((p) => PLATFORM_CONFIG[p]?.label ?? p)
                      .join(", ")}
                  </p>
                  <p>
                    <span className="font-medium">Pillar:</span>{" "}
                    {pillarConfig(pillar)?.label ?? pillar}
                  </p>
                  <p>
                    <span className="font-medium">Destination:</span>{" "}
                    {skipApproval ? "Drafts" : "Approval queue"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleFinalize}
                disabled={busy || !chosenCaption || !previewUrl}
                className="gap-2"
              >
                {finalizeMut.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : skipApproval ? (
                  <FileText className="size-5" />
                ) : (
                  <Send className="size-5" />
                )}
                {skipApproval
                  ? `Save ${selectedPlatforms.length} draft${selectedPlatforms.length === 1 ? "" : "s"}`
                  : `Submit ${selectedPlatforms.length} for approval`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back button (all steps except settings) */}
      {step !== "settings" && (
        <div className="flex">
          <Button variant="ghost" onClick={goBack} disabled={busy} className="gap-2">
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
