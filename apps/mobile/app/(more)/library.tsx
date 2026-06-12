import { EmptyHint, Loading, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { trpc } from "@/lib/trpc";
import { PLATFORM_META, formatRelativeTime, type Platform } from "@optentia/core";
import { Image } from "expo-image";
import { Text, View } from "react-native";

export default function Library() {
  const { clientId, enabled } = useClientScope();
  const posts = trpc.posts.list.useQuery({ clientId, status: "published", limit: 60 }, { enabled });

  if (posts.isLoading) return <Screen><Loading /></Screen>;
  if (!posts.data?.length) return <Screen><EmptyHint>No published posts yet.</EmptyHint></Screen>;

  return (
    <Screen>
      {posts.data.map((p) => {
        const meta = PLATFORM_META[p.platform as Platform];
        return (
          <View key={p.id} className="flex-row gap-3 rounded-[22px] border border-border bg-surface p-3">
            {p.imageUrl ? (
              <Image source={{ uri: p.imageUrl }} style={{ width: 64, height: 64, borderRadius: 14 }} contentFit="cover" />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-[14px] bg-muted">
                <Text>{meta?.icon ?? "🗎"}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                {p.title ?? p.caption ?? "Post"}
              </Text>
              <Text className="font-mono text-[11px] text-muted-foreground">
                {meta?.label ?? p.platform} · {formatRelativeTime(p.createdAt)}
              </Text>
              {p.caption ? (
                <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>{p.caption}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}
