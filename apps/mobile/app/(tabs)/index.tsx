import { PLATFORM_META, formatRelativeTime, type Platform } from "@optentia/core";
import { useRouter } from "expo-router";
import { BarChart3, Brain, CalendarDays, Check, Lightbulb, Plus, Sparkles, X, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AIGradient } from "@/components/AIGradient";
import { ClientSwitcher } from "@/components/ClientSwitcher";
import { Glass } from "@/components/ui";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors, type Palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { activeClient, clients, isLoading: clientsLoading } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const { theme } = useTheme();
  const c = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const aiText = theme === "dark" ? "#ffffff" : "#0e1b2c";

  const summary = trpc.analytics.summary.useQuery({ clientId }, { enabled, refetchInterval: 30_000 });
  const pending = trpc.posts.pendingApproval.useQuery({ clientId }, { enabled });

  const invalidate = () => {
    utils.posts.invalidate();
    utils.analytics.invalidate();
  };
  const approve = trpc.posts.approve.useMutation({ onSuccess: invalidate });
  const reject = trpc.posts.reject.useMutation({ onSuccess: invalidate });
  const busy = approve.isPending || reject.isPending;

  const refreshing = summary.isRefetching || pending.isRefetching;
  const onRefresh = () => {
    summary.refetch();
    pending.refetch();
  };

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const nPending = summary.data?.pending ?? 0;
  const nScheduled = summary.data?.scheduled ?? 0;
  const nPublished = summary.data?.published ?? 0;
  const nTotal = summary.data?.total ?? 0;
  const approvals = (pending.data ?? []).slice(0, 4);

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 130, gap: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* Header */}
        <View className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Workspace · {today}
            </Text>
            <ClientSwitcher />
          </View>
          <Text className="font-serif text-[34px] leading-[1.05]" style={{ color: c.strong }} numberOfLines={2}>
            {activeClient?.name ?? "Dashboard"}
          </Text>
          <View className="mt-1 flex-row items-center gap-2 self-start rounded-2xl border border-border bg-surface px-3 py-1.5">
            <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: c.accentStrong }} />
            <Text className="text-xs text-muted-foreground">
              Brand Brain calibrated{activeClient?.industry ? ` · ${activeClient.industry}` : " · ready for review"}
            </Text>
          </View>
        </View>

        {!enabled ? (
          clientsLoading ? (
            <Glass className="mt-2 p-8">
              <ActivityIndicator color={c.accent} />
            </Glass>
          ) : (
            <Glass className="mt-2 p-6">
              <Text className="text-center text-sm text-muted-foreground">
                {clients.length === 0
                  ? "No clients yet — add one on the web to get started."
                  : "Select a client from the switcher above to get started."}
              </Text>
            </Glass>
          )
        ) : (
          <>
            {/* Actions */}
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => router.push("/(tabs)/campaigns")}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 active:opacity-80"
              >
                <Plus color={c.muted} size={16} />
                <Text className="font-medium text-foreground">New campaign</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(more)/generate")} className="flex-1 active:opacity-80">
                <AIGradient
                  borderRadius={16}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 }}
                >
                  <Sparkles color={aiText} size={16} />
                  <Text className="font-semibold" style={{ color: aiText }}>Generate posts</Text>
                </AIGradient>
              </Pressable>
            </View>

            {/* KPIs */}
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Kpi label="Pending approval" value={nPending} delta="Waiting in the queue" valueColor="#f59e0b" c={c} onPress={() => router.push("/(tabs)/queue")} />
                <Kpi label="Scheduled" value={nScheduled} delta="Going out automatically" valueColor={c.strong} c={c} onPress={() => router.push("/(tabs)/calendar")} />
              </View>
              <View className="flex-row gap-3">
                <Kpi label="Published" value={nPublished} delta="▲ live across channels" valueColor={c.accent} deltaColor={c.success} c={c} onPress={() => router.push("/(more)/analytics")} />
                <Kpi label="Total posts" value={nTotal} delta="in this workspace" valueColor={c.strong} labelColor={c.accentStrong} ai c={c} />
              </View>
            </View>

            {/* Brand Brain */}
            <View className="overflow-hidden rounded-[22px]">
              <AIGradient borderRadius={22} style={{ padding: 1.5 }}>
                <View className="flex-row items-center gap-3.5 rounded-[20px] bg-surface-solid p-4">
                  <AIGradient borderRadius={14} style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}>
                    <Brain color={aiText} size={23} />
                  </AIGradient>
                  <View className="flex-1">
                    <Text className="font-mono text-[9.5px] uppercase tracking-widest" style={{ color: c.accentStrong }}>
                      Brand Brain · working
                    </Text>
                    <Text className="mt-1 text-[13px] leading-5 text-foreground">
                      {nPending > 0
                        ? `Drafted content for ${activeClient?.name} and lined up ${nPending} post${nPending === 1 ? "" : "s"} that match its voice. Ready for your review.`
                        : `Tuned to ${activeClient?.name}'s voice. Nothing's waiting — generate a fresh batch whenever you're ready.`}
                    </Text>
                  </View>
                </View>
              </AIGradient>
            </View>

            {/* Needs your approval */}
            <Glass className="p-5">
              <View className="flex-row items-center justify-between border-b border-border pb-3">
                <Text className="text-[15px] font-semibold text-foreground">
                  Needs your approval{" "}
                  <Text className="font-mono text-[11px] text-muted-foreground">
                    {approvals.length} of {nPending}
                  </Text>
                </Text>
                <Pressable onPress={() => router.push("/(tabs)/queue")} hitSlop={8}>
                  <Text className="font-mono text-[10.5px] uppercase tracking-wider" style={{ color: c.accentStrong }}>
                    Open queue →
                  </Text>
                </Pressable>
              </View>
              {pending.isLoading ? (
                <ActivityIndicator color={c.accent} className="my-5" />
              ) : approvals.length === 0 ? (
                <Text className="py-5 text-sm text-muted-foreground">All caught up — nothing pending review.</Text>
              ) : (
                approvals.map((p, i) => {
                  const plat = PLATFORM_META[p.platform as Platform];
                  return (
                    <View
                      key={p.id}
                      className="flex-row items-center gap-3 py-3.5"
                      style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : undefined}
                    >
                      <View className="h-[34px] w-[34px] items-center justify-center rounded-[9px]" style={{ backgroundColor: plat?.hex ?? c.muted }}>
                        <Text className="text-[15px]">{plat?.icon ?? "📝"}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[13.5px] font-medium text-foreground" numberOfLines={1}>
                          {p.title ?? p.caption ?? "Untitled post"}
                        </Text>
                        <Text className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {plat?.label ?? p.platform} · {formatRelativeTime(p.createdAt)}
                        </Text>
                      </View>
                      <View className="flex-row gap-1.5">
                        <Pressable
                          disabled={busy}
                          onPress={() => approve.mutate({ id: p.id })}
                          className="h-8 w-8 items-center justify-center rounded-[9px] border"
                          style={{ borderColor: c.success }}
                        >
                          <Check color={c.success} size={15} />
                        </Pressable>
                        <Pressable
                          disabled={busy}
                          onPress={() => reject.mutate({ id: p.id, reason: "" })}
                          className="h-8 w-8 items-center justify-center rounded-[9px] border"
                          style={{ borderColor: c.danger }}
                        >
                          <X color={c.danger} size={15} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </Glass>

            {/* Quick actions */}
            <Glass className="p-5">
              <Text className="mb-3 text-[15px] font-semibold text-foreground">Quick actions</Text>
              <View className="gap-2.5">
                <View className="flex-row gap-2.5">
                  <Qa icon={Lightbulb} title="Brainstorm" sub="Swipe fresh ideas" c={c} onPress={() => router.push("/(tabs)/brainstorm")} />
                  <Qa icon={CalendarDays} title="Schedule batch" sub={`${nScheduled} ready to slot`} c={c} onPress={() => router.push("/(tabs)/calendar")} />
                </View>
                <View className="flex-row gap-2.5">
                  <Qa icon={Brain} title="Tune voice" sub="Brand Brain" c={c} onPress={() => router.push("/(more)/brand")} />
                  <Qa icon={BarChart3} title="Weekly report" sub={`${nPublished} published`} c={c} onPress={() => router.push("/(more)/analytics")} />
                </View>
              </View>
            </Glass>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** KPI tile mirroring the web `.kpi` (label · big value · delta), with the `ai` accent variant. */
function Kpi({
  label,
  value,
  delta,
  valueColor,
  labelColor,
  deltaColor,
  ai,
  c,
  onPress,
}: {
  label: string;
  value: number;
  delta: string;
  valueColor: string;
  labelColor?: string;
  deltaColor?: string;
  ai?: boolean;
  c: Palette;
  onPress?: () => void;
}) {
  return (
    <Pressable className="flex-1 active:opacity-80" onPress={onPress} disabled={!onPress}>
      <Glass className="min-h-[120px] p-4">
        <Text className="font-mono text-[10px] uppercase tracking-widest" style={{ color: labelColor ?? c.muted }}>
          {label}
        </Text>
        <Text className="mt-2 text-[38px] font-bold leading-none" style={{ color: valueColor }}>
          {value}
        </Text>
        <Text className="mt-3 font-mono text-[11px]" style={{ color: deltaColor ?? c.muted }}>
          {delta}
        </Text>
      </Glass>
    </Pressable>
  );
}

/** Quick-action tile mirroring the web `.qa`. */
function Qa({
  icon: Icon,
  title,
  sub,
  c,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  c: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3.5 active:opacity-80"
    >
      <View className="h-9 w-9 items-center justify-center rounded-[9px]" style={{ backgroundColor: c.accentTint }}>
        <Icon color={c.accentStrong} size={16} />
      </View>
      <View className="flex-1">
        <Text className="text-[12.5px] font-medium text-foreground">{title}</Text>
        <Text className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">{sub}</Text>
      </View>
    </Pressable>
  );
}
