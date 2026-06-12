import { Card, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { trpc } from "@/lib/trpc";
import { CONTENT_PILLARS, PLATFORM_META, type Platform } from "@optentia/core";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

const PLATFORMS: Platform[] = ["instagram", "linkedin_personal", "facebook", "youtube"];

export default function Generate() {
  const { clientId, enabled } = useClientScope();
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [pillar, setPillar] = useState(CONTENT_PILLARS[0].value);
  const [topic, setTopic] = useState("");

  const generate = trpc.posts.generateAI.useMutation({
    onSuccess: () => router.push("/(tabs)/queue"),
  });

  return (
    <Screen>
      <Card>
        <Text className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Platform</Text>
        <View className="flex-row flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = platform === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPlatform(p)}
                className="rounded-full border px-3 py-1.5"
                style={{ borderColor: active ? "#5fd0de" : "rgba(255,255,255,0.14)", backgroundColor: active ? "rgba(95,208,222,0.16)" : "transparent" }}
              >
                <Text className={active ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
                  {PLATFORM_META[p].icon} {PLATFORM_META[p].label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Content pillar</Text>
        <View className="gap-2">
          {CONTENT_PILLARS.map((p) => {
            const active = pillar === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => setPillar(p.value)}
                className="rounded-xl border p-3"
                style={{ borderColor: active ? "#5fd0de" : "rgba(255,255,255,0.14)", backgroundColor: active ? "rgba(95,208,222,0.12)" : "transparent" }}
              >
                <Text className="text-sm font-medium text-foreground">{p.label}</Text>
                <Text className="text-xs text-muted-foreground">{p.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Topic (optional)</Text>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="What should this post be about?"
          placeholderTextColor="#8a9bb0"
          multiline
          className="min-h-[64px] rounded-xl border border-border px-3 py-2 text-foreground"
        />
      </Card>

      <Pressable
        disabled={!enabled || generate.isPending}
        onPress={() => generate.mutate({ clientId, platform, contentPillar: pillar as never, topic: topic || undefined, autoSubmitForApproval: true })}
        className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-80"
        style={{ opacity: generate.isPending ? 0.7 : 1 }}
      >
        {generate.isPending ? <ActivityIndicator color="#06121f" /> : <Sparkles color="#06121f" size={18} />}
        <Text className="font-semibold text-primary-foreground">
          {generate.isPending ? "Generating…" : "Generate post"}
        </Text>
      </Pressable>
    </Screen>
  );
}
