import { PLATFORM_META, type Platform } from "@optentia/core";
import { IDEA_TYPE_LABELS, type IdeaType } from "@shared/platforms";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

export type IdeaCardData = {
  id: number;
  type: string;
  title: string | null;
  hook: string | null;
  description: string | null;
  platform: string | null;
  contentPillar: string | null;
  visualConcept: string | null;
  cta: string | null;
};

// Deterministic gradient per idea type — the prototype's idea art.
const GRADS: [string, string][] = [
  ["#2DD4BF", "#1E5A66"],
  ["#F59E0B", "#B45309"],
  ["#B79CF5", "#5B3FA8"],
  ["#FF8FB1", "#B43E63"],
  ["#34D399", "#0E7A5F"],
];

/** A single brainstorm idea, styled for the native swipe deck. Opaque surface so
 *  stacked cards never bleed through (matching the web fix). */
export function IdeaCard({ idea }: { idea: IdeaCardData }) {
  const typeLabel = IDEA_TYPE_LABELS[idea.type as IdeaType] ?? idea.type;
  const plat = idea.platform ? PLATFORM_META[idea.platform as Platform] : null;
  const grad = GRADS[Math.abs(hash(idea.type)) % GRADS.length];

  return (
    <View className="h-full overflow-hidden rounded-[28px] border border-border bg-surface-solid">
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 150 }}>
        <View className="flex-row items-start justify-between p-4">
          <View className="rounded-lg bg-black/25 px-2.5 py-1">
            <Text className="font-mono text-[11px] uppercase tracking-wider text-white">{typeLabel}</Text>
          </View>
          {plat ? (
            <View className="rounded-lg bg-black/25 px-2.5 py-1">
              <Text className="text-[11px] text-white">
                {plat.icon} {plat.label}
              </Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View className="flex-1 justify-center gap-3 px-5 py-2">
        <Text className="text-xl font-bold text-foreground" numberOfLines={3}>
          {idea.hook || idea.title}
        </Text>
        {idea.description ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={5}>
            {idea.description}
          </Text>
        ) : null}
      </View>

      <View className="gap-1 border-t border-border px-5 py-4">
        {idea.cta ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            <Text className="font-medium text-foreground">CTA: </Text>
            {idea.cta}
          </Text>
        ) : null}
        {idea.contentPillar ? (
          <Text className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {idea.contentPillar.replace(/_/g, " ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
