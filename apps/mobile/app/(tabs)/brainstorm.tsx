import { IdeaCard, type IdeaCardData } from "@/components/IdeaCard";
import { SwipeDeck, type SwipeDirection } from "@/components/SwipeDeck";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { Sparkles } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Brainstorm() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const [deckVersion, setDeckVersion] = useState(0);
  const c = useColors();

  const proposed = trpc.brainstorm.getBrainstormIdeas.useQuery(
    { clientId, status: "proposed" },
    { enabled, refetchOnWindowFocus: false, staleTime: 5 * 60_000 },
  );

  const generate = trpc.brainstorm.generateBrainstormIdeas.useMutation({
    onSuccess: () => {
      utils.brainstorm.getBrainstormIdeas.invalidate();
      setDeckVersion((v) => v + 1);
    },
  });
  const updateIdea = trpc.brainstorm.updateBrainstormIdea.useMutation();
  const saveSignal = trpc.brainstorm.savePreferenceSignal.useMutation();

  const deckItems = useMemo(
    () => (proposed.data ?? []) as IdeaCardData[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposed.data, deckVersion],
  );

  const handleSwipe = (idea: IdeaCardData, direction: SwipeDirection) => {
    const status = direction === "right" ? "liked" : direction === "up" ? "saved" : "discarded";
    updateIdea.mutate({ id: idea.id, clientId, status });
    saveSignal.mutate({
      clientId,
      signalType: "idea_swipe",
      targetType: "brainstorm_idea",
      targetId: idea.id,
      direction: direction === "left" ? "negative" : "positive",
      content: idea.hook ?? idea.title ?? undefined,
      reason: direction === "up" ? "Saved for campaign" : undefined,
    });
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="flex-1 px-5 pt-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Create{activeClient ? ` · ${activeClient.name}` : ""}
            </Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">Brainstorm</Text>
            <Text className="mt-1 text-xs text-muted-foreground">Every swipe teaches the AI.</Text>
          </View>
          <Pressable
            disabled={!enabled || generate.isPending}
            onPress={() => generate.mutate({ clientId, count: 10 })}
            className="flex-row items-center gap-1.5 rounded-xl bg-primary px-3 py-2 active:opacity-80"
          >
            <Sparkles color={c.onAccent} size={16} />
            <Text className="font-semibold text-primary-foreground">Generate</Text>
          </Pressable>
        </View>

        <View className="flex-1 justify-center pb-6">
          {generate.isPending ? (
            <View className="items-center gap-3">
              <ActivityIndicator color={c.accent} />
              <Text className="text-sm text-muted-foreground">Dealing your deck…</Text>
            </View>
          ) : proposed.isLoading ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <SwipeDeck
              key={`${clientId}-${deckVersion}-${deckItems[0]?.id ?? "empty"}`}
              items={deckItems}
              renderCard={(idea) => <IdeaCard idea={idea} />}
              onSwipe={handleSwipe}
              emptyState={
                <View className="items-center gap-3 px-8">
                  <Text className="text-xl font-bold text-foreground">Deck's empty</Text>
                  <Text className="text-center text-sm text-muted-foreground">
                    Generate a fresh batch — the AI sharpens with every swipe.
                  </Text>
                  <Pressable
                    disabled={!enabled || generate.isPending}
                    onPress={() => generate.mutate({ clientId, count: 10 })}
                    className="mt-2 rounded-xl bg-primary px-4 py-2.5 active:opacity-80"
                  >
                    <Text className="font-semibold text-primary-foreground">Generate 10 ideas</Text>
                  </Pressable>
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
