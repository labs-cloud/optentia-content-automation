import { Card, EmptyHint, Loading, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { formatRelativeTime } from "@optentia/core";
import { Text, View } from "react-native";

const STATUS_HEX: Record<string, string> = {
  pending: "#F59E0B",
  processing: "#6AA0F5",
  completed: "#34D399",
  failed: "#FF5B5B",
};

export default function HeyGen() {
  const { clientId, enabled } = useClientScope();
  const c = useColors();
  const reqs = trpc.heygen.list.useQuery({ clientId }, { enabled });

  if (reqs.isLoading) return <Screen><Loading /></Screen>;
  if (!reqs.data?.length) return <Screen><EmptyHint>No HeyGen videos yet — create one on the web.</EmptyHint></Screen>;

  return (
    <Screen>
      {reqs.data.map((r) => {
        const hex = STATUS_HEX[r.status] ?? c.muted;
        return (
          <Card key={r.id}>
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-base font-medium text-foreground" numberOfLines={1}>{r.title}</Text>
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: hex + "22" }}>
                <Text className="font-mono text-[11px] capitalize" style={{ color: hex }}>{r.status}</Text>
              </View>
            </View>
            {r.scriptText ? (
              <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>{r.scriptText}</Text>
            ) : null}
            {r.createdAt ? (
              <Text className="mt-1 font-mono text-[11px] text-muted-foreground">{formatRelativeTime(r.createdAt)}</Text>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
