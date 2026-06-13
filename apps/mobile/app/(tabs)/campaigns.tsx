import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { CAMPAIGN_GOAL_LABELS, type CampaignGoal } from "@shared/platforms";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Campaigns() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const router = useRouter();
  const colors = useColors();
  const campaigns = trpc.campaigns.getCampaigns.useQuery({ clientId }, { enabled });

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="px-5 pt-3">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Create · {activeClient?.name ?? ""}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Campaigns</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 12 }}>
        {campaigns.isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (campaigns.data?.length ?? 0) === 0 ? (
          <View className="rounded-[22px] border border-border bg-surface p-6">
            <Text className="text-center text-sm text-muted-foreground">
              No campaigns yet — plan one on the web.
            </Text>
          </View>
        ) : (
          campaigns.data?.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/(more)/campaign/${c.id}` as never)}
              className="rounded-[22px] border border-border bg-surface p-4"
            >
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-base font-semibold text-foreground">{c.name}</Text>
                <View className="rounded-lg bg-primary/15 px-2 py-0.5">
                  <Text className="font-mono text-[11px] capitalize text-primary">{c.status}</Text>
                </View>
              </View>
              <Text className="mt-1 text-sm text-muted-foreground">
                {CAMPAIGN_GOAL_LABELS[c.goal as CampaignGoal] ?? c.goal}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
