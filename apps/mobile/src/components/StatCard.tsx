import { Text } from "react-native";
import { Glass } from "@/components/ui";

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
    <Glass className="p-4" style={{ flex: 1 }}>
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
    </Glass>
  );
}
