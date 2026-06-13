import { PLATFORM_META, STATUS_META, formatRelativeTime, type Platform, type PostStatus } from "@optentia/core";
import { Check, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useColors } from "@/theme/colors";

export type ApprovalPost = {
  id: number;
  title: string | null;
  caption: string | null;
  hashtags: string | null;
  platform: string;
  status: string;
  imageUrl: string | null;
  scheduledAt: Date | string | null;
  createdAt: Date | string;
  isWinner?: boolean | null;
};

/** Approval-queue card with platform/status chips and approve/reject actions. */
export function ApprovalCard({
  post,
  busy,
  onApprove,
  onReject,
}: {
  post: ApprovalPost;
  busy?: boolean;
  onApprove: (p: ApprovalPost) => void;
  onReject: (p: ApprovalPost) => void;
}) {
  const plat = PLATFORM_META[post.platform as Platform];
  const status = STATUS_META[post.status as PostStatus];
  const pending = post.status === "pending_approval";
  const c = useColors();

  return (
    <View className="rounded-[22px] border border-border bg-surface p-4">
      <View className="flex-row flex-wrap items-center gap-2">
        {plat ? (
          <View className="rounded-md px-2 py-0.5" style={{ borderWidth: 1, borderColor: plat.hex + "66" }}>
            <Text className="font-mono text-[11px]" style={{ color: plat.hex }}>
              {plat.icon} {plat.label}
            </Text>
          </View>
        ) : null}
        {status ? (
          <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: status.hex + "22" }}>
            <Text className="font-mono text-[11px]" style={{ color: status.hex }}>
              {status.label}
            </Text>
          </View>
        ) : null}
        <Text className="ml-auto font-mono text-[11px] text-muted-foreground">
          {formatRelativeTime(post.createdAt)}
        </Text>
      </View>

      {post.title ? (
        <Text className="mt-3 text-[15px] font-semibold text-foreground" numberOfLines={2}>
          {post.title}
        </Text>
      ) : null}
      {post.caption ? (
        <Text className="mt-1 text-[13px] text-muted-foreground" numberOfLines={3}>
          {post.caption}
        </Text>
      ) : null}
      {post.hashtags ? (
        <Text className="mt-1 font-mono text-[11px] text-accent-bright" numberOfLines={1}>
          {post.hashtags}
        </Text>
      ) : null}

      {pending ? (
        <View className="mt-4 flex-row gap-2">
          <Pressable
            disabled={busy}
            onPress={() => onApprove(post)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#10B981] py-2.5 active:opacity-80"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Check color="#fff" size={16} />}
            <Text className="font-semibold text-white">Approve</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => onReject(post)}
            style={{ borderColor: c.danger }}
            className="flex-row items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 active:opacity-80"
          >
            <X color={c.danger} size={16} />
            <Text className="font-medium" style={{ color: c.danger }}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
