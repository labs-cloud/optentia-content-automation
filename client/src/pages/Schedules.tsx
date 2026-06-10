import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, CRON_PRESETS, isManualPlatform } from "@/lib/platformUtils";
import { useClientScope } from "@/contexts/ActiveClientContext";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, Clock, Loader2, Plus, Timer, Trash2, Zap } from "lucide-react";
import { useLocation } from "wouter";

type Platform = "instagram" | "linkedin_personal" | "linkedin_company" | "facebook" | "youtube" | "email" | "whatsapp";

const PILLAR_OPTIONS = [
  { value: "strong_opinion", label: "Strong Opinion" },
  { value: "practical_education", label: "Practical Education" },
  { value: "documentary", label: "Documentary" },
  { value: "direct_promotion", label: "Direct Promotion" },
];

export default function Schedules() {
  const [, setLocation] = useLocation();
  const { clientId, enabled } = useClientScope();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cron, setCron] = useState("0 0 9 * * *");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["instagram", "linkedin_personal", "linkedin_company"]);
  const [postsPerRun, setPostsPerRun] = useState(2);
  const [selectedPillars, setSelectedPillars] = useState<string[]>(["strong_opinion", "practical_education"]);
  const [generationPrompt, setGenerationPrompt] = useState("");

  const utils = trpc.useUtils();
  const { data: schedules, isLoading } = trpc.schedules.list.useQuery({ clientId }, { enabled });

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule created and cron job registered");
      setShowCreate(false);
      resetForm();
      utils.schedules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.schedules.toggle.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Schedule activated" : "Schedule paused");
      utils.schedules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      utils.schedules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setCron("0 0 9 * * *");
    setSelectedPlatforms(["instagram", "linkedin_personal", "linkedin_company"]);
    setPostsPerRun(2);
    setSelectedPillars(["strong_opinion", "practical_education"]);
    setGenerationPrompt("");
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const togglePillar = (p: string) => {
    setSelectedPillars((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return toast.error("Schedule name is required");
    if (selectedPlatforms.length === 0) return toast.error("Select at least one platform");
    createMutation.mutate({
      clientId,
      name,
      description: description || undefined,
      cron,
      platforms: selectedPlatforms,
      postsPerRun,
      contentPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
      generationPrompt: generationPrompt || undefined,
    });
  };

  if (!enabled) {
    return (
      <div className="p-6 max-w-4xl">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Select a client workspace to manage its automated content schedules."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            Schedules
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated content generation and publishing schedules
          </p>
        </div>
        <Button size="sm" className="gap-2 glow-primary" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (schedules ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <Timer className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No schedules configured yet</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules?.map((schedule) => {
            const platforms: Platform[] = JSON.parse(schedule.platforms ?? "[]");
            const preset = CRON_PRESETS.find((p) => p.value === schedule.cron);
            return (
              <Card key={schedule.id} className={`bg-card border-border/50 ${schedule.isActive ? "border-primary/20" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${schedule.isActive ? "bg-primary/10" : "bg-muted/30"}`}>
                        <Zap className={`h-5 w-5 ${schedule.isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold">{schedule.name}</h3>
                          <Badge className={`text-xs h-5 px-2 border-0 ${schedule.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted/50 text-muted-foreground"}`}>
                            {schedule.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        {schedule.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{schedule.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {preset?.label ?? schedule.cron}
                          </div>
                          <div className="flex items-center gap-1">
                            {platforms.map((p) => (
                              <span key={p} title={PLATFORM_CONFIG[p]?.label} className="text-sm">
                                {PLATFORM_CONFIG[p]?.icon}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {schedule.postsPerRun} post{schedule.postsPerRun !== 1 ? "s" : ""}/run
                          </span>
                        </div>
                        {schedule.lastRunAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last run: {new Date(schedule.lastRunAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: schedule.id, isActive: v })}
                        disabled={toggleMutation.isPending}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate({ id: schedule.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info */}
      <Card className="bg-muted/20 border-border/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">How Schedules Work</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>• Each schedule runs a cron job that automatically generates AI content at the configured time.</p>
            <p>• Generated posts are sent to the Content Queue for your approval before publishing.</p>
            <p>• You receive an owner notification each time new content is generated and awaiting review.</p>
            <p>• Schedules can be paused and resumed at any time without losing configuration.</p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Create Content Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1.5 block">Schedule Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily Morning Content"
                  className="bg-muted/30 border-border/50"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="bg-muted/30 border-border/50"
                />
              </div>
            </div>

            {/* Cron Preset */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Schedule Frequency</label>
              <Select value={cron} onValueChange={setCron}>
                <SelectTrigger className="bg-muted/30 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Cron: <code className="text-primary">{cron}</code></p>
            </div>

            {/* Platforms */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Target Platforms *</label>
              <div className="grid grid-cols-3 gap-2">
                {(["instagram", "linkedin_personal", "linkedin_company", "facebook", "youtube", "email", "whatsapp"] as Platform[]).map((p) => {
                  const cfg = PLATFORM_CONFIG[p];
                  const selected = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs ${
                        selected ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color}` : "bg-muted/20 border-border/50 text-muted-foreground"
                      }`}
                    >
                      <span className="text-xl">{cfg.icon}</span>
                      <span>{cfg.label}{isManualPlatform(p) ? " (manual send)" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posts per run */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Posts per Run</label>
              <Select value={String(postsPerRun)} onValueChange={(v) => setPostsPerRun(Number(v))}>
                <SelectTrigger className="bg-muted/30 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} post{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Pillars */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Content Pillars</label>
              <div className="grid grid-cols-2 gap-2">
                {PILLAR_OPTIONS.map((p) => {
                  const selected = selectedPillars.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => togglePillar(p.value)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
                        selected ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-border/50 text-muted-foreground"
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${selected ? "bg-primary" : "bg-muted-foreground"}`} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Prompt */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Custom Generation Prompt <span className="opacity-60">(optional)</span></label>
              <Textarea
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                placeholder="Override the default AI prompt with specific instructions..."
                rows={3}
                className="bg-muted/30 border-border/50 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
