import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, CONTENT_PILLARS } from "@/lib/platformUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles, Zap } from "lucide-react";
import { useLocation } from "wouter";

type Platform = "instagram" | "linkedin_personal" | "linkedin_company" | "facebook" | "youtube";
type Pillar = "strong_opinion" | "practical_education" | "documentary" | "direct_promotion";

type GeneratedPost = {
  id: number;
  platform: string;
  title: string | null;
  caption: string | null;
  hashtags: string | null;
  imageUrl: string | null;
  status: string;
};

export default function AIGenerator() {
  const [, setLocation] = useLocation();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["instagram", "linkedin_personal", "linkedin_company"]);
  const [selectedPillar, setSelectedPillar] = useState<Pillar>("strong_opinion");
  const [topic, setTopic] = useState("");
  const [autoApproval, setAutoApproval] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);

  const utils = trpc.useUtils();

  const generateMutation = trpc.posts.generateAI.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      utils.analytics.summary.invalidate();
    },
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    setIsGenerating(true);
    setGeneratedCount(0);
    setGeneratedPosts([]);
    let count = 0;
    const newPosts: GeneratedPost[] = [];
    for (const platform of selectedPlatforms) {
      try {
        const result = await generateMutation.mutateAsync({
          platform,
          contentPillar: selectedPillar,
          topic: topic || undefined,
          autoSubmitForApproval: !autoApproval,
        });
        if (result) {
          newPosts.push({
            id: result.id,
            platform: result.platform,
            title: result.title ?? null,
            caption: result.caption ?? null,
            hashtags: result.hashtags ?? null,
            imageUrl: (result as any).imageUrl ?? null,
            status: result.status,
          });
        }
        count++;
        setGeneratedCount(count);
      } catch {
        // error already toasted
      }
    }
    setIsGenerating(false);
    setGeneratedPosts(newPosts);
    if (count > 0) {
      toast.success(`Generated ${count} post${count > 1 ? "s" : ""} — ${autoApproval ? "saved as drafts" : "sent for approval"}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Content Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate platform-optimized posts using Optentia's brand voice and content strategy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-3 space-y-5">
          {/* Platform Selection */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Target Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([platform, cfg]) => {
                  const selected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selected
                          ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`
                          : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-xl">{cfg.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{cfg.label}</p>
                        <p className="text-xs opacity-70">
                          {platform === "instagram" ? "Reels & captions" :
                           platform === "linkedin_personal" ? "Personal thought leadership" :
                           platform === "linkedin_company" ? "Company page posts" :
                           platform === "facebook" ? "Discussion posts" :
                           "Video scripts"}
                        </p>
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content Pillar */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Content Pillar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {CONTENT_PILLARS.map((pillar) => {
                  const selected = selectedPillar === pillar.value;
                  return (
                    <button
                      key={pillar.value}
                      onClick={() => setSelectedPillar(pillar.value as Pillar)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                        selected
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${selected ? "bg-primary" : "bg-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium">{pillar.label}</p>
                        <p className="text-xs opacity-70 mt-0.5">{pillar.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Topic / Angle */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Topic or Angle <span className="text-muted-foreground font-normal">(optional)</span></CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 'Why most businesses fail at AI implementation' or 'The 3-step CRM automation workflow'"
                rows={3}
                className="bg-muted/30 border-border/50 resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Leave blank and the AI will choose a compelling topic aligned with Optentia's brand.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Generation Settings */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Skip approval queue</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Save as draft instead of pending review</p>
                </div>
                <Switch checked={autoApproval} onCheckedChange={setAutoApproval} />
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""} selected — will generate {selectedPlatforms.length} post{selectedPlatforms.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full gap-2 glow-primary h-12 text-base font-semibold"
            onClick={handleGenerate}
            disabled={isGenerating || selectedPlatforms.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating {generatedCount}/{selectedPlatforms.length}...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Generate {selectedPlatforms.length} Post{selectedPlatforms.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>

          {/* Brand Context */}
          <Card className="bg-muted/20 border-border/30">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Brand Context</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>AI systems & automation operator</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>Strategic, calm, intelligent, direct</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span>40% opinions · 30% education · 20% documentary · 10% promo</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setLocation("/queue")}
            >
              View Content Queue
            </Button>
          </div>
        </div>

        {/* Generated Posts Preview */}
        {generatedPosts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-semibold">Generated Posts</h2>
              <span className="text-xs text-muted-foreground">{generatedPosts.length} post{generatedPosts.length > 1 ? "s" : ""} created</span>
            </div>
            <div className="grid gap-4">
              {generatedPosts.map((post) => {
                const cfg = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                return (
                  <Card key={post.id} className="bg-card border-border/50">
                    <CardContent className="p-5">
                      <div className="flex gap-4">
                        {/* Image preview */}
                        {post.imageUrl ? (
                          <img
                            src={post.imageUrl}
                            alt="Generated"
                            className="h-28 w-28 object-cover rounded-lg border border-border/50 shrink-0"
                          />
                        ) : (
                          <div className={`h-28 w-28 rounded-lg ${cfg?.bgColor} border ${cfg?.borderColor} flex items-center justify-center shrink-0`}>
                            <span className="text-3xl">{cfg?.icon}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-semibold ${cfg?.color}`}>{cfg?.label}</span>
                            <div className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400">
                              {post.status === "pending_approval" ? "Pending Review" : "Draft"}
                            </div>
                            {post.imageUrl && (
                              <div className="px-2 py-0.5 rounded-full text-xs bg-violet-500/10 text-violet-400">
                                AI Image
                              </div>
                            )}
                          </div>
                          {post.title && (
                            <p className="text-sm font-semibold mb-1 line-clamp-1">{post.title}</p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{post.caption}</p>
                          {post.hashtags && (
                            <p className="text-xs text-primary/60 mt-1.5 line-clamp-1">{post.hashtags}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button
              variant="outline"
              className="w-full text-sm gap-2"
              onClick={() => setLocation("/queue")}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Review & Approve in Content Queue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
