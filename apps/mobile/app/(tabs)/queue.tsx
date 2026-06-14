import { ApprovalCard, type ApprovalPost } from "@/components/ApprovalCard";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TABS = [
  { value: "pending_approval", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

export default function Queue() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("pending_approval");
  const c = useColors();

  const posts = trpc.posts.list.useQuery({ clientId, status: tab, limit: 50 }, { enabled });

  const invalidate = () => {
    utils.posts.invalidate();
    utils.analytics.invalidate();
  };
  const approve = trpc.posts.approve.useMutation({ onSuccess: invalidate });
  const reject = trpc.posts.reject.useMutation({ onSuccess: invalidate });
  const busy = approve.isPending || reject.isPending;

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="px-5 pt-3">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Operate{activeClient ? ` · ${activeClient.name}` : ""}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Approval queue</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -mx-1">
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setTab(t.value)}
                className="mx-1 rounded-full border px-3.5 py-1.5"
                style={{
                  borderColor: active ? c.accent : c.border,
                  backgroundColor: active ? c.accentTint : "transparent",
                }}
              >
                <Text className={active ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 12 }}>
        {posts.isLoading ? (
          <ActivityIndicator color={c.accent} />
        ) : (posts.data?.length ?? 0) === 0 ? (
          <View className="rounded-[22px] border border-border bg-surface p-6">
            <Text className="text-center text-sm text-muted-foreground">
              Nothing in this category.
            </Text>
          </View>
        ) : (
          posts.data?.map((p) => (
            <ApprovalCard
              key={p.id}
              post={p as ApprovalPost}
              busy={busy}
              onApprove={(post) => approve.mutate({ id: post.id })}
              onReject={(post) => reject.mutate({ id: post.id, reason: "" })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
