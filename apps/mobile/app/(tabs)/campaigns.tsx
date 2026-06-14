import { ChipSelect, FormSheet, Input, PrimaryButton } from "@/components/ui";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { PLATFORM_META, type Platform } from "@optentia/core";
import { CAMPAIGN_GOALS, CAMPAIGN_GOAL_LABELS, type CampaignGoal } from "@shared/platforms";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const POST_PLATFORMS: Platform[] = ["instagram", "linkedin_personal", "linkedin_company", "facebook", "youtube"];

export default function Campaigns() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();
  const campaigns = trpc.campaigns.getCampaigns.useQuery({ clientId }, { enabled });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<CampaignGoal>("awareness");
  const [duration, setDuration] = useState("14");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram"]);
  const [offer, setOffer] = useState("");
  const [brief, setBrief] = useState("");

  const reset = () => {
    setName(""); setGoal("awareness"); setDuration("14"); setPlatforms(["instagram"]); setOffer(""); setBrief("");
  };

  const create = trpc.campaigns.createCampaign.useMutation({
    onSuccess: (camp) => {
      utils.campaigns.getCampaigns.invalidate();
      setOpen(false);
      reset();
      if (camp?.id) router.push(`/(more)/campaign/${camp.id}` as never);
    },
  });

  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const save = () => {
    const days = Math.min(90, Math.max(3, parseInt(duration, 10) || 14));
    if (!name.trim() || platforms.length === 0) return;
    create.mutate({
      clientId,
      name: name.trim(),
      goal,
      durationDays: days,
      platforms,
      offer: offer.trim() || undefined,
      brief: brief.trim() || undefined,
    });
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="px-5 pt-3">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Create{activeClient ? ` · ${activeClient.name}` : ""}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Campaigns</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 12 }}>
        <Pressable
          onPress={() => setOpen(true)}
          disabled={!enabled}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 active:opacity-80"
          style={{ opacity: enabled ? 1 : 0.5 }}
        >
          <Plus color={colors.accentStrong} size={18} />
          <Text className="font-medium text-foreground">New campaign</Text>
        </Pressable>

        {campaigns.isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (campaigns.data?.length ?? 0) === 0 ? (
          <Text className="py-4 text-center text-sm text-muted-foreground">
            No campaigns yet — create your first one above.
          </Text>
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

      <FormSheet visible={open} onClose={() => setOpen(false)} title="New campaign">
        <Input label="Name" value={name} onChangeText={setName} placeholder="Spring launch" autoCapitalize="words" />

        <View className="gap-1.5">
          <Text className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Goal</Text>
          <View className="flex-row flex-wrap gap-2">
            {CAMPAIGN_GOALS.map((g) => {
              const active = goal === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  className="rounded-full border px-3 py-1.5"
                  style={{ borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentTint : "transparent" }}
                >
                  <Text className={active ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
                    {CAMPAIGN_GOAL_LABELS[g]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ChipSelect
          label="Platforms"
          options={POST_PLATFORMS.map((p) => ({ value: p, label: `${PLATFORM_META[p].icon} ${PLATFORM_META[p].label}` }))}
          selected={platforms}
          onToggle={togglePlatform}
        />

        <Input label="Duration (days)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        <Input label="Offer (optional)" value={offer} onChangeText={setOffer} placeholder="What you're promoting" />
        <Input label="Brief (optional)" value={brief} onChangeText={setBrief} placeholder="Angle, theme, must-haves…" multiline />

        <PrimaryButton
          label="Create campaign"
          icon={Plus}
          onPress={save}
          loading={create.isPending}
          disabled={!name.trim() || platforms.length === 0}
        />
      </FormSheet>
    </SafeAreaView>
  );
}
