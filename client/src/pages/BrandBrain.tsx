import { AIThinkingState } from "@/components/AIThinkingState";
import { BrandProfilePanel, type BrandProfileFields } from "@/components/BrandProfilePanel";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PremiumCard } from "@/components/PremiumCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { formatRelativeTime } from "@/lib/platformUtils";
import { trpc } from "@/lib/trpc";
import { Brain, Briefcase, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function BrandBrain() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [sourceText, setSourceText] = useState("");

  const { data: profile, isLoading } = trpc.brandProfile.get.useQuery({ clientId }, { enabled });
  const { data: signals } = trpc.brandProfile.signals.useQuery({ clientId, limit: 20 }, { enabled });

  const updateMutation = trpc.brandProfile.update.useMutation({
    onSuccess: () => {
      toast.success("Brand profile saved");
      utils.brandProfile.get.invalidate({ clientId });
    },
    onError: (err) => toast.error(err.message),
  });

  const generateMutation = trpc.brandProfile.generateBrandProfile.useMutation({
    onSuccess: () => {
      toast.success("Brand Operating Profile generated");
      utils.brandProfile.get.invalidate({ clientId });
      setGenerateOpen(false);
      setSourceText("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!enabled) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Add a client first — the Brand Brain stores everything the AI knows about one brand."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  const onSave = (fields: BrandProfileFields) => {
    updateMutation.mutate({ clientId, ...fields });
  };

  return (
    <div className="container py-6 sm:py-8 space-y-6 max-w-4xl">
      <PageHeader
        eyebrow={activeClient?.name ? `Create · ${activeClient.name}` : "Create"}
        title="Brand Brain"
        pill="Every generation runs through this"
        actions={
          <Button onClick={() => setGenerateOpen(true)} className="rounded-xl" disabled={generateMutation.isPending}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            {profile ? "Regenerate with AI" : "Generate with AI"}
          </Button>
        }
      />

      {generateMutation.isPending ? (
        <PremiumCard>
          <AIThinkingState
            label="Building the Brand Operating Profile"
            messages={[
              "Reading the client's info…",
              "Mapping the audience and their pains…",
              "Defining the voice…",
              "Setting visual and CTA direction…",
              "Writing the brand summary…",
            ]}
          />
        </PremiumCard>
      ) : isLoading ? (
        <AIThinkingState messages={["Loading brand profile…"]} />
      ) : !profile ? (
        <EmptyState
          icon={Brain}
          title="No Brand Operating Profile yet"
          description={`Generate one from ${activeClient?.name}'s details — you can paste website copy or examples for a sharper result.`}
          actionLabel="Generate Brand Profile"
          onAction={() => setGenerateOpen(true)}
        />
      ) : (
        <BrandProfilePanel profile={profile} onSave={onSave} saving={updateMutation.isPending} />
      )}

      {/* Learning feed */}
      {signals && signals.length > 0 && (
        <PremiumCard className="p-5">
          <h2 className="font-display font-semibold mb-1">What the AI has learned</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Recent preference signals from swipes, approvals and rejections — these steer future generations.
          </p>
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {signals.map((signal) => (
              <div key={signal.id} className="flex items-start gap-2.5 text-sm">
                {signal.direction === "positive" ? (
                  <ThumbsUp className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <ThumbsDown className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground line-clamp-2">
                    {signal.content || signal.reason || signal.signalType.replace(/_/g, " ")}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="rounded text-[10px] py-0 capitalize">
                      {signal.signalType.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground/60">
                      {formatRelativeTime(signal.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      )}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Generate Brand Operating Profile</DialogTitle>
            <DialogDescription>
              The AI uses {activeClient?.name}'s name, website, industry, offer and audience. Paste extra source
              material below for a sharper profile (website copy, about page, example posts).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={7}
            placeholder="Optional: paste website copy, an about page, or example content…"
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate({ clientId, sourceText: sourceText || undefined })}
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
