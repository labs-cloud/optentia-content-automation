import { Text, View } from "react-native";

/** KPI card — DM Mono label, large value, optional hint. */
export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <View className="flex-1 rounded-[22px] border border-border bg-surface p-4">
      <Text className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
      <Text
        className="mt-2 text-3xl font-bold text-foreground"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </Text>
      {hint ? <Text className="mt-1 text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}
