import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Clapperboard, Clock, Loader2, Play, Plus, RefreshCw, Sparkles } from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10" },
  processing: { label: "Processing", color: "text-blue-400", bg: "bg-blue-500/10" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10" },
};

export default function HeyGen() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [checkApiKey, setCheckApiKey] = useState("");
  const [generateScript, setGenerateScript] = useState(false);
  const [scriptTopic, setScriptTopic] = useState("");

  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.heygen.list.useQuery();

  const generateScriptMutation = trpc.posts.generateAI.useMutation({
    onSuccess: (data) => {
      if (data?.scriptText) {
        setScriptText(data.scriptText);
        toast.success("Script generated — review and submit to HeyGen");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = trpc.heygen.createRequest.useMutation({
    onSuccess: () => {
      toast.success("HeyGen video request created");
      setShowCreate(false);
      resetForm();
      utils.heygen.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const checkStatusMutation = trpc.heygen.checkStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Status: ${data?.status}`);
      utils.heygen.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setTitle("");
    setScriptText("");
    setAvatarId("");
    setVoiceId("");
    setApiKey("");
    setGenerateScript(false);
    setScriptTopic("");
  };

  const handleGenerateScript = () => {
    generateScriptMutation.mutate({
      platform: "youtube",
      contentPillar: "practical_education",
      topic: scriptTopic || undefined,
      autoSubmitForApproval: false,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Clapperboard className="h-6 w-6 text-primary" />
            HeyGen Videos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create AI avatar videos with custom scripts for your social channels
          </p>
        </div>
        <Button size="sm" className="gap-2 glow-primary" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Video Request
        </Button>
      </div>

      {/* Video Request List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : (requests ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <Clapperboard className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No video requests yet</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first video
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests?.map((req) => {
            const statusStyle = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;
            return (
              <Card key={req.id} className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      {req.status === "completed" ? (
                        <Play className="h-5 w-5 text-red-400 fill-red-400" />
                      ) : req.status === "processing" ? (
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      ) : (
                        <Clapperboard className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold">{req.title}</h3>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusStyle.bg} ${statusStyle.color}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${statusStyle.color.replace("text-", "bg-")}`} />
                          {statusStyle.label}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{req.scriptText}</p>
                      {req.avatarId && (
                        <p className="text-xs text-muted-foreground mt-1">Avatar: {req.avatarId}</p>
                      )}
                      {req.durationSeconds && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {req.durationSeconds}s
                        </div>
                      )}
                      {req.errorMessage && (
                        <p className="text-xs text-red-400 mt-1 bg-red-500/10 px-2 py-1 rounded">
                          Error: {req.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {req.videoUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5 h-8"
                          onClick={() => window.open(req.videoUrl!, "_blank")}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Watch
                        </Button>
                      )}
                      {(req.status === "pending" || req.status === "processing") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs gap-1.5 h-8"
                          onClick={() => {
                            const key = prompt("Enter your HeyGen API key to check status:");
                            if (key) checkStatusMutation.mutate({ id: req.id, apiKey: key });
                          }}
                          disabled={checkStatusMutation.isPending}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${checkStatusMutation.isPending ? "animate-spin" : ""}`} />
                          Check Status
                        </Button>
                      )}
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">HeyGen Integration</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>• Use the AI Script Generator to create compelling video scripts from Optentia's brand voice.</p>
            <p>• Submit scripts to HeyGen with your avatar and voice IDs to generate AI presenter videos.</p>
            <p>• Completed videos can be linked to YouTube posts in your content library.</p>
            <p>• Get your HeyGen API key at <a href="https://app.heygen.com" target="_blank" className="text-primary hover:underline">app.heygen.com</a></p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">New HeyGen Video Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Video Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Why AI Systems Beat Manual Workflows"
                className="bg-muted/30 border-border/50"
              />
            </div>

            {/* Script Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground">Video Script *</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={scriptTopic}
                    onChange={(e) => setScriptTopic(e.target.value)}
                    placeholder="Topic for AI script..."
                    className="bg-muted/30 border-border/50 h-7 text-xs w-48"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={handleGenerateScript}
                    disabled={generateScriptMutation.isPending}
                  >
                    {generateScriptMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    AI Script
                  </Button>
                </div>
              </div>
              <Textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Write or generate a script for your AI avatar to present..."
                rows={8}
                className="bg-muted/30 border-border/50 resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Avatar ID <span className="opacity-60">(optional)</span></label>
                <Input
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                  placeholder="HeyGen avatar ID"
                  className="bg-muted/30 border-border/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Voice ID <span className="opacity-60">(optional)</span></label>
                <Input
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="HeyGen voice ID"
                  className="bg-muted/30 border-border/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">HeyGen API Key <span className="opacity-60">(to submit immediately)</span></label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Leave blank to save as pending"
                className="bg-muted/30 border-border/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ title, scriptText, avatarId: avatarId || undefined, voiceId: voiceId || undefined, apiKey: apiKey || undefined })}
              disabled={createMutation.isPending || !title || !scriptText}
              className="gap-2"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
