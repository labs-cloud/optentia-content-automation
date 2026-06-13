import { StatCard } from "@/components/StatCard";
import { Card, EmptyHint, Loading, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { PLATFORM_META, type Platform } from "@optentia/core";
import { Text, View } from "react-native";

export default function Analytics() {
  const { clientId, enabled } = useClientScope();
  const c = useColors();
  const summary = trpc.analytics.summary.useQuery({ clientId }, { enabled });
  const byPlatform = trpc.analytics.byPlatform.useQuery({ clientId }, { enabled });

  if (summary.isLoading) return <Screen><Loading /></Screen>;

  const rows = byPlatform.data ?? [];
  const max = Math.max(1, ...rows.map((r) => r.published ?? 0));

  return (
    <Screen>
      <View className="flex-row gap-3">
        <StatCard label="Published" value={summary.data?.published ?? 0} accent={c.accent} />
        <StatCard label="Scheduled" value={summary.data?.scheduled ?? 0} accent="#6AA0F5" />
      </View>
      <View className="flex-row gap-3">
        <StatCard label="Pending" value={summary.data?.pending ?? 0} accent="#F59E0B" />
        <StatCard label="Total" value={summary.data?.total ?? 0} />
      </View>

      <Text className="mt-4 text-lg font-semibold text-foreground">Published by platform</Text>
      {rows.length === 0 ? (
        <EmptyHint>No published posts yet.</EmptyHint>
      ) : (
        <Card>
          <View className="gap-3">
            {rows.map((r) => {
              const meta = PLATFORM_META[r.platform as Platform];
              return (
                <View key={r.platform} className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-foreground">{meta?.label ?? r.platform}</Text>
                    <Text className="font-mono text-xs text-muted-foreground">{r.published ?? 0}</Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-muted">
                    <View
                      style={{
                        width: `${((r.published ?? 0) / max) * 100}%`,
                        height: "100%",
                        backgroundColor: meta?.hex ?? c.accent,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}
    </Screen>
  );
}
