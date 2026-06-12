import { type ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

/** Padded scroll container for secondary screens (header supplied by the stack). */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 12 }}>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View className="rounded-[22px] border border-border bg-surface p-4">{children}</View>;
}

export function Loading() {
  return (
    <View className="py-10">
      <ActivityIndicator color="#5fd0de" />
    </View>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <Card>
      <Text className="py-2 text-center text-sm text-muted-foreground">{children}</Text>
    </Card>
  );
}

export function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="gap-0.5">
      <Text className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Text>
      <Text className="text-sm text-foreground">{value}</Text>
    </View>
  );
}
