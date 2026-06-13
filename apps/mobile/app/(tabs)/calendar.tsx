import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { PLATFORM_META, formatScheduledTime, type Platform } from "@optentia/core";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Calendar() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const c = useColors();
  const posts = trpc.posts.list.useQuery({ clientId, status: "scheduled", limit: 100 }, { enabled });

  const sorted = [...(posts.data ?? [])].sort(
    (a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime(),
  );

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="px-5 pt-3">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Operate · {activeClient?.name ?? ""}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Calendar</Text>
        <Text className="mt-1 text-xs text-muted-foreground">Upcoming scheduled posts</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 12 }}>
        {posts.isLoading ? (
          <ActivityIndicator color={c.accent} />
        ) : sorted.length === 0 ? (
          <View className="rounded-[22px] border border-border bg-surface p-6">
            <Text className="text-center text-sm text-muted-foreground">Nothing scheduled.</Text>
          </View>
        ) : (
          sorted.map((p) => {
            const meta = PLATFORM_META[p.platform as Platform];
            return (
              <View key={p.id} className="flex-row gap-3 rounded-[22px] border border-border bg-surface p-4">
                <View className="items-center">
                  <Text className="text-xl">{meta?.icon ?? "🗓"}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-mono text-[11px] text-accent-bright">
                    {formatScheduledTime(p.scheduledAt)}
                  </Text>
                  <Text className="mt-0.5 text-sm font-medium text-foreground" numberOfLines={1}>
                    {p.title ?? p.caption ?? "Post"}
                  </Text>
                  <Text className="font-mono text-[11px] text-muted-foreground">
                    {meta?.label ?? p.platform}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
