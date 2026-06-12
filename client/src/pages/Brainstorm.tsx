import { AIThinkingState } from "@/components/AIThinkingState";
import { EmptyState } from "@/components/EmptyState";
import { IdeaCard, type IdeaCardData } from "@/components/IdeaCard";
import { MobileSheet } from "@/components/MobileSheet";
import { PremiumCard } from "@/components/PremiumCard";
import { SwipeDeck, type SwipeDirection } from "@/components/SwipeDeck";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { trpc } from "@/lib/trpc";
import { IDEA_TYPE_LABELS, type IdeaType } from "@shared/platforms";
import { Briefcase, Heart, Lightbulb, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Brainstorm() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [theme, setTheme] = useState("");
  const [detailIdea, setDetailIdea] = useState<IdeaCardData | null>(null);
  // Local deck: freshly generated or loaded "proposed" ideas.
  const [deckVersion, setDeckVersion] = useState(0);

  const proposedQuery = trpc.brainstorm.getBrainstormIdeas.useQuery(
    { clientId, status: "proposed" },
    // Don't refetch mid-swipe — the deck would reset under the user's finger.
    { enabled, refetchOnWindowFocus: false, staleTime: 5 * 60_000 },
  );
  const likedQuery = trpc.brainstorm.getBrainstormIdeas.useQuery(
    { clientId, status: "liked" },
    { enabled },
  );

  const generateMutation = trpc.brainstorm.generateBrainstormIdeas.useMutation({
    onSuccess: (ideas) => {
      toast.success(`${ideas.length} fresh ideas ready`);
      utils.brainstorm.getBrainstormIdeas.invalidate();
      setDeckVersion((v) => v + 1);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateIdea = trpc.brainstorm.updateBrainstormIdea.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const saveSignal = trpc.brainstorm.savePreferenceSignal.useMutation();
  const generatePost = trpc.posts.generateAI.useMutation({
    onSuccess: () => toast.success("Draft created — check the content queue"),
    onError: (err) => toast.error(err.message),
  });

  const deckItems = useMemo(
    () => (proposedQuery.data ?? []) as IdeaCardData[],
    // Re-key the deck when a new batch lands so the cursor resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposedQuery.data, deckVersion],
  );

  const handleSwipe = (idea: IdeaCardData, direction: SwipeDirection) => {
    const status = direction === "right" ? "liked" : direction === "up" ? "saved" : "discarded";
    updateIdea.mutate(
      { id: idea.id, clientId, status },
      {
        onSuccess: () => {
          utils.brainstorm.getBrainstormIdeas.invalidate({ clientId, status: "liked" });
        },
      },
    );
    saveSignal.mutate({
      clientId,
      signalType: "idea_swipe",
      targetType: "brainstorm_idea",
      targetId: idea.id,
      direction: direction === "left" ? "negative" : "positive",
      content: idea.hook ?? idea.title ?? undefined,
      reason: direction === "up" ? "Saved for campaign" : undefined,
    });
    if (direction === "up") toast("Saved for campaigns", { icon: "📌" });
  };

  const promoteToPost = (idea: IdeaCardData) => {
    generatePost.mutate({
      clientId,
      platform: (idea.platform as any) ?? "linkedin_personal",
      contentPillar: (idea.contentPillar as any) ?? "strong_opinion",
      topic: [idea.hook ?? idea.title, idea.description].filter(Boolean).join(" — "),
      autoSubmitForApproval: true,
    });
    updateIdea.mutate({ id: idea.id, clientId, status: "promoted" });
  };

  if (!enabled) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Pick or create a client to start brainstorming."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  const liked = (likedQuery.data ?? []) as IdeaCardData[];

  return (
    <div className="container py-6 sm:py-8 space-y-6">
      <div className="topbar">
        <div>
          <div className="eyebrow">Create · {activeClient?.name}</div>
          <h1 className="page-h1">Brainstorm</h1>
          <div className="topbar-pill">
            <span className="pulse" /> Every swipe teaches the AI what this brand likes
          </div>
        </div>
        <div className="topbar-actions">
          <Input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Optional theme…"
            className="rounded-xl w-44 sm:w-56"
          />
          <button
            className="btn btn-ai"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate({ clientId, count: 10, theme: theme || undefined })}
          >
            <Sparkles /> Generate ideas
          </button>
        </div>
      </div>

      {generateMutation.isPending ? (
        <PremiumCard>
          <AIThinkingState
            label="Brainstorming"
            messages={[
              "Reading the brand brain…",
              "Studying liked and rejected ideas…",
              "Hunting for sharp angles…",
              "Mixing hooks, reels, emails and offers…",
              "Dealing your deck…",
            ]}
          />
        </PremiumCard>
      ) : proposedQuery.isLoading ? (
        <AIThinkingState messages={["Loading ideas…"]} />
      ) : (
        <SwipeDeck
          key={`${clientId}-${deckVersion}-${deckItems.length > 0 ? deckItems[0].id : "empty"}`}
          items={deckItems}
          renderCard={(idea) => <IdeaCard idea={idea} />}
          onSwipe={handleSwipe}
          onCardTap={(idea) => setDetailIdea(idea)}
          className="py-2"
          emptyState={
            <EmptyState
              icon={Lightbulb}
              title="Deck's empty"
              description="Generate a fresh batch of ideas — the AI gets sharper with every swipe you've made."
              actionLabel="Generate 10 ideas"
              onAction={() => generateMutation.mutate({ clientId, count: 10, theme: theme || undefined })}
            />
          }
        />
      )}

      {/* Liked tray */}
      {liked.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-400" /> Liked ideas
            <Badge variant="outline" className="rounded-lg">{liked.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liked.slice(0, 9).map((idea) => (
              <PremiumCard key={idea.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="rounded-lg text-[11px] text-primary border-primary/40">
                    {IDEA_TYPE_LABELS[idea.type as IdeaType] ?? idea.type}
                  </Badge>
                </div>
                <p className="text-sm font-medium leading-snug line-clamp-2">{idea.hook ?? idea.title}</p>
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg flex-1"
                    disabled={generatePost.isPending}
                    onClick={() => promoteToPost(idea)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Make post
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={() => setLocation("/campaigns?new=1")}
                  >
                    Use in campaign
                  </Button>
                </div>
              </PremiumCard>
            ))}
          </div>
        </div>
      )}

      {/* Idea detail sheet */}
      <MobileSheet
        open={detailIdea !== null}
        onOpenChange={(open) => !open && setDetailIdea(null)}
        title={detailIdea?.hook ?? detailIdea?.title ?? "Idea"}
        description={IDEA_TYPE_LABELS[detailIdea?.type as IdeaType] ?? detailIdea?.type ?? undefined}
      >
        {detailIdea && (
          <div className="space-y-4">
            {detailIdea.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{detailIdea.description}</p>
            )}
            {detailIdea.visualConcept && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Visual concept</p>
                <p className="text-sm text-muted-foreground">{detailIdea.visualConcept}</p>
              </div>
            )}
            {detailIdea.cta && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">CTA</p>
                <p className="text-sm text-muted-foreground">{detailIdea.cta}</p>
              </div>
            )}
            <Button
              className="w-full rounded-xl"
              disabled={generatePost.isPending}
              onClick={() => {
                promoteToPost(detailIdea);
                setDetailIdea(null);
              }}
            >
              <Send className="h-4 w-4 mr-1.5" /> Turn into a post
            </Button>
          </div>
        )}
      </MobileSheet>
    </div>
  );
}
