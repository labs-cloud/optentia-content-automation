import { Card, EmptyHint, Loading, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { PLATFORM_META, type Platform } from "@optentia/core";
import { Text, View } from "react-native";

export default function Platforms() {
  const { clientId, enabled } = useClientScope();
  const c = useColors();
  const platforms = trpc.platforms.list.useQuery({ clientId }, { enabled });

  if (platforms.isLoading) return <Screen><Loading /></Screen>;
  if (!platforms.data?.length) return <Screen><EmptyHint>No platforms configured.</EmptyHint></Screen>;

  return (
    <Screen>
      {platforms.data.map((p) => {
        const meta = PLATFORM_META[p.platform as Platform];
        const connected = p.status === "connected";
        return (
          <Card key={p.platform}>
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">{meta?.icon ?? "🔌"}</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">{meta?.label ?? p.platform}</Text>
                {p.accountName ? (
                  <Text className="text-xs text-muted-foreground">{p.accountName}</Text>
                ) : null}
              </View>
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: connected ? "rgba(52,211,153,0.16)" : "rgba(120,140,175,0.16)" }}
              >
                <Text className="font-mono text-[11px]" style={{ color: connected ? c.success : c.muted }}>
                  {connected ? "Connected" : "Not connected"}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}
      <Text className="px-1 text-xs text-muted-foreground">
        Connect and test platforms on the web for now.
      </Text>
    </Screen>
  );
}
