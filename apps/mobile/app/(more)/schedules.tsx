import { Card, EmptyHint, Loading, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { trpc } from "@/lib/trpc";
import { formatScheduledTime } from "@optentia/core";
import { Text, View } from "react-native";

export default function Schedules() {
  const { clientId, enabled } = useClientScope();
  const schedules = trpc.schedules.list.useQuery({ clientId }, { enabled });

  if (schedules.isLoading) return <Screen><Loading /></Screen>;
  if (!schedules.data?.length) return <Screen><EmptyHint>No schedules yet.</EmptyHint></Screen>;

  return (
    <Screen>
      {schedules.data.map((s) => (
        <Card key={s.id}>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-base font-medium text-foreground">{s.name}</Text>
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: s.isActive ? "rgba(52,211,153,0.16)" : "rgba(120,140,175,0.16)" }}
            >
              <Text className="font-mono text-[11px]" style={{ color: s.isActive ? "#34D399" : "#8a9bb0" }}>
                {s.isActive ? "Active" : "Paused"}
              </Text>
            </View>
          </View>
          {s.nextRunAt ? (
            <Text className="mt-1 font-mono text-[11px] text-muted-foreground">
              Next run · {formatScheduledTime(s.nextRunAt as unknown as string)}
            </Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
