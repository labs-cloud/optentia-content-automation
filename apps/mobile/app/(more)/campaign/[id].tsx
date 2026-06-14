import { Card, EmptyHint, Loading, PrimaryButton, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { trpc } from "@/lib/trpc";
import { STATUS_META, type PostStatus } from "@optentia/core";
import { useLocalSearchParams } from "expo-router";
import { Sparkles, Wand2 } from "lucide-react-native";
import { Text, View } from "react-native";

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clientId, enabled } = useClientScope();
  const utils = trpc.useUtils();
  const campaignId = Number(id);
  const campaign = trpc.campaigns.getCampaignById.useQuery(
    { clientId, id: campaignId },
    { enabled: enabled && !!id },
  );

  const refresh = () => utils.campaigns.invalidate();
  const generatePlan = trpc.campaigns.generateCampaign.useMutation({ onSuccess: refresh });
  const generateContent = trpc.campaigns.generateContentFromCampaign.useMutation({ onSuccess: refresh });

  if (campaign.isLoading) return <Screen><Loading /></Screen>;
  const c = campaign.data;
  if (!c) return <Screen><EmptyHint>Campaign not found.</EmptyHint></Screen>;

  const items = c.items ?? [];
  const plannedCount = items.filter((i) => i.status === "planned").length;

  return (
    <Screen>
      <Text className="text-2xl font-bold text-foreground">{c.name}</Text>
      <View className="flex-row gap-2">
        <View className="rounded-full bg-primary/15 px-2.5 py-1">
          <Text className="font-mono text-[11px] capitalize text-primary">{c.status}</Text>
        </View>
      </View>
      {c.description ? <Text className="text-sm text-muted-foreground">{c.description}</Text> : null}

      <PrimaryButton
        label={items.length ? "Regenerate plan" : "Generate plan"}
        icon={Wand2}
        onPress={() => generatePlan.mutate({ clientId, campaignId })}
        loading={generatePlan.isPending}
      />

      {/* Plan items */}
      {items.length ? (
        <>
          <Text className="mt-2 text-lg font-semibold text-foreground">Content plan · {items.length}</Text>
          {items.map((it) => (
            <Card key={it.id}>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
                  {it.conceptTitle ?? "Concept"}
                </Text>
                <Text className="font-mono text-[11px] capitalize text-muted-foreground">{it.status}</Text>
              </View>
              {it.conceptDescription ? (
                <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={3}>{it.conceptDescription}</Text>
              ) : null}
            </Card>
          ))}
          {plannedCount > 0 ? (
            <PrimaryButton
              label={`Generate content (${plannedCount})`}
              icon={Sparkles}
              onPress={() => generateContent.mutate({ clientId, campaignId })}
              loading={generateContent.isPending}
            />
          ) : null}
        </>
      ) : null}

      {/* Generated posts */}
      <Text className="mt-3 text-lg font-semibold text-foreground">
        Posts {c.posts?.length ? `· ${c.posts.length}` : ""}
      </Text>
      {!c.posts?.length ? (
        <EmptyHint>No posts generated for this campaign yet.</EmptyHint>
      ) : (
        c.posts.map((p) => {
          const status = STATUS_META[p.status as PostStatus];
          return (
            <Card key={p.id}>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
                  {p.title ?? p.caption ?? "Post"}
                </Text>
                {status ? (
                  <Text className="font-mono text-[11px]" style={{ color: status.hex }}>{status.label}</Text>
                ) : null}
              </View>
              {p.caption ? (
                <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>{p.caption}</Text>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
