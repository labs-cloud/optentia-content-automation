import { BlurView } from "expo-blur";
import { type ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useColors } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Frosted-glass panel: a real BlurView frosts the aurora behind a translucent
 * `surface` tint, with a soft drop shadow so panels float. The shadow lives on
 * an outer wrapper because iOS clips shadows on any view with `overflow: hidden`
 * (which the rounded blur layer needs).
 */
export function Glass({
  children,
  className = "",
  radius = 22,
  style,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <View
      style={[
        {
          borderRadius: radius,
          shadowColor: dark ? "#000000" : "#1b2a44",
          shadowOpacity: dark ? 0.45 : 0.14,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
        },
        style,
      ]}
    >
      <View className={`overflow-hidden border border-border ${className}`} style={{ borderRadius: radius }}>
        <BlurView
          intensity={dark ? 24 : 38}
          tint={dark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View className="bg-surface" style={StyleSheet.absoluteFill} />
        {children}
      </View>
    </View>
  );
}

/** Padded scroll container for secondary screens (header supplied by the stack). */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 12 }}>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <Glass className="p-4">{children}</Glass>;
}

export function Loading() {
  const c = useColors();
  return (
    <View className="py-10">
      <ActivityIndicator color={c.accent} />
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
