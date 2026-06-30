import { Card, ChipSelect, FormSheet, Input, Loading, PrimaryButton, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { PLATFORM_META, formatScheduledTime, type Platform } from "@optentia/core";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const SCHED_PLATFORMS: Platform[] = [
  "instagram", "linkedin_personal", "linkedin_company", "facebook", "youtube", "email", "whatsapp",
];

const FREQ: { value: "daily" | "weekdays" | "weekly"; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly (Mon)" },
];

function toCron(freq: "daily" | "weekdays" | "weekly", hour: number): string {
  const h = Math.min(23, Math.max(0, hour));
  if (freq === "weekdays") return `0 ${h} * * 1-5`;
  if (freq === "weekly") return `0 ${h} * * 1`;
  return `0 ${h} * * *`;
}

export default function Schedules() {
  const { clientId, enabled } = useClientScope();
  const c = useColors();
  const utils = trpc.useUtils();
  const schedules = trpc.schedules.list.useQuery({ clientId }, { enabled });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<"daily" | "weekdays" | "weekly">("daily");
  const [hour, setHour] = useState("9");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram"]);
  const [perRun, setPerRun] = useState("1");
  const [prompt, setPrompt] = useState("");

  const reset = () => {
    setName(""); setFreq("daily"); setHour("9"); setPlatforms(["instagram"]); setPerRun("1"); setPrompt("");
  };

  const create = trpc.schedules.create.useMutation({
    onSuccess: () => { utils.schedules.list.invalidate(); setOpen(false); reset(); },
  });
  const toggle = trpc.schedules.toggle.useMutation({ onSuccess: () => utils.schedules.list.invalidate() });

  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const save = () => {
    if (!name.trim() || platforms.length === 0) return;
    create.mutate({
      clientId,
      name: name.trim(),
      cron: toCron(freq, parseInt(hour, 10) || 9),
      platforms,
      postsPerRun: Math.max(1, parseInt(perRun, 10) || 1),
      generationPrompt: prompt.trim() || undefined,
    });
  };

  if (schedules.isLoading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={!enabled}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 active:opacity-80"
        style={{ opacity: enabled ? 1 : 0.5 }}
      >
        <Plus color={c.accentStrong} size={18} />
        <Text className="font-medium text-foreground">New schedule</Text>
      </Pressable>

      {!schedules.data?.length ? (
        <Text className="py-4 text-center text-sm text-muted-foreground">No schedules yet — create one above.</Text>
      ) : (
        schedules.data.map((s) => (
          <Card key={s.id}>
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-base font-medium text-foreground">{s.name}</Text>
              <Pressable
                onPress={() => toggle.mutate({ id: s.id, isActive: !s.isActive })}
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: s.isActive ? "rgba(52,211,153,0.16)" : "rgba(120,140,175,0.16)" }}
              >
                <Text className="font-mono text-[11px]" style={{ color: s.isActive ? c.success : c.muted }}>
                  {s.isActive ? "Active" : "Paused"}
                </Text>
              </Pressable>
            </View>
            {s.nextRunAt ? (
              <Text className="mt-1 font-mono text-[11px] text-muted-foreground">
                Next run · {formatScheduledTime(s.nextRunAt as unknown as string)}
              </Text>
            ) : null}
          </Card>
        ))
      )}

      <FormSheet visible={open} onClose={() => setOpen(false)} title="New schedule">
        <Input label="Name" value={name} onChangeText={setName} placeholder="Weekday mornings" autoCapitalize="words" />

        <View className="gap-1.5">
          <Text className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Frequency</Text>
          <View className="flex-row flex-wrap gap-2">
            {FREQ.map((f) => {
              const active = freq === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFreq(f.value)}
                  className="rounded-full border px-3 py-1.5"
                  style={{ borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentTint : "transparent" }}
                >
                  <Text className={active ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input label="Hour (0–23)" value={hour} onChangeText={setHour} keyboardType="number-pad" />
        <ChipSelect
          label="Platforms"
          options={SCHED_PLATFORMS.map((p) => ({ value: p, label: `${PLATFORM_META[p].icon} ${PLATFORM_META[p].label}` }))}
          selected={platforms}
          onToggle={togglePlatform}
        />
        <Input label="Posts per run" value={perRun} onChangeText={setPerRun} keyboardType="number-pad" />
        <Input label="Generation prompt (optional)" value={prompt} onChangeText={setPrompt} placeholder="Theme or angle for generated posts" multiline />

        <PrimaryButton
          label="Create schedule"
          icon={Plus}
          onPress={save}
          loading={create.isPending}
          disabled={!name.trim() || platforms.length === 0}
        />
      </FormSheet>
    </Screen>
  );
}
