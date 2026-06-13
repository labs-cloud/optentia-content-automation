import { ClientSwitcher } from "@/components/ClientSwitcher";
import { StatCard } from "@/components/StatCard";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { formatRelativeTime } from "@optentia/core";
import { useRouter } from "expo-router";
import { MoreHorizontal } from "lucide-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Dashboard() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const router = useRouter();
  const c = useColors();

  const summary = trpc.analytics.summary.useQuery({ clientId }, { enabled, refetchInterval: 30_000 });
  const pending = trpc.posts.pendingApproval.useQuery({ clientId }, { enabled });
  const approve = trpc.posts.approve.useMutation({
    onSuccess: () => {
      utils.posts.invalidate();
      utils.analytics.invalidate();
    },
  });

  const refreshing = summary.isRefetching || pending.isRefetching;
  const onRefresh = () => {
    summary.refetch();
    pending.refetch();
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Workspace
            </Text>
            <Text className="mt-1 text-3xl font-bold text-foreground" numberOfLines={1}>
              {activeClient?.name ?? "Dashboard"}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">What needs you today</Text>
          </View>
          <View className="items-end gap-2">
            <ClientSwitcher />
            <Pressable
              onPress={() => router.push("/(more)/menu")}
              className="flex-row items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5"
            >
              <MoreHorizontal size={16} color={c.muted} />
              <Text className="text-xs text-muted-foreground">More</Text>
            </Pressable>
          </View>
        </View>

        {!enabled ? (
          <View className="mt-8 rounded-[22px] border border-border bg-surface p-6">
            <Text className="text-center text-sm text-muted-foreground">
              No client selected — add one on the web to get started.
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-6 gap-3">
              <View className="flex-row gap-3">
                <StatCard label="Pending approval" value={summary.data?.pending ?? 0} accent="#F59E0B" hint="Waiting in the queue" />
                <StatCard label="Scheduled" value={summary.data?.scheduled ?? 0} accent="#6AA0F5" hint="Going out automatically" />
              </View>
              <View className="flex-row gap-3">
                <StatCard label="Published" value={summary.data?.published ?? 0} accent={c.accent} />
                <StatCard label="Total posts" value={summary.data?.total ?? 0} />
              </View>
            </View>

            <Text className="mt-7 text-lg font-semibold text-foreground">Needs your approval</Text>
            <View className="mt-3 rounded-[22px] border border-border bg-surface p-4">
              {pending.isLoading ? (
                <ActivityIndicator color={c.accent} />
              ) : (pending.data?.length ?? 0) === 0 ? (
                <Text className="py-4 text-center text-sm text-muted-foreground">
                  All caught up — nothing pending review.
                </Text>
              ) : (
                <View className="gap-3">
                  {pending.data?.slice(0, 4).map((p) => (
                    <View key={p.id} className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                          {p.title ?? p.caption ?? "Untitled post"}
                        </Text>
                        <Text className="font-mono text-[11px] text-muted-foreground">
                          {p.platform} · {formatRelativeTime(p.createdAt)}
                        </Text>
                      </View>
                      <Text
                        onPress={() => approve.mutate({ id: p.id })}
                        className="font-semibold text-[#10B981]"
                      >
                        Approve
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
