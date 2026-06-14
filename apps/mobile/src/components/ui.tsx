import { BlurView } from "expo-blur";
import { X, type LucideIcon } from "lucide-react-native";
import { type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ViewStyle,
} from "react-native";
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

/** Labeled text input used across the create/edit forms. */
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const c = useColors();
  return (
    <View className="gap-1.5">
      <Text className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className={`rounded-xl border border-border px-3 py-2.5 text-foreground ${multiline ? "min-h-[80px]" : ""}`}
        style={multiline ? { textAlignVertical: "top" } : undefined}
      />
    </View>
  );
}

/** Primary action button (filled accent) with loading + optional leading icon. */
export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  const c = useColors();
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-80"
      style={{ opacity: disabled || loading ? 0.55 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color={c.onAccent} />
      ) : Icon ? (
        <Icon color={c.onAccent} size={18} />
      ) : null}
      <Text className="font-semibold text-primary-foreground">{label}</Text>
    </Pressable>
  );
}

/** Bottom-sheet modal used for create/edit forms. */
export function FormSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="max-h-[90%] rounded-t-[28px] border-t border-border bg-background">
            <View className="flex-row items-center justify-between px-5 pb-1 pt-4">
              <Text className="text-lg font-semibold text-foreground">{title}</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <X color={c.muted} size={22} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 36, gap: 14 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** A pill multi-select used for platform / pillar pickers. */
export function ChipSelect<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View className="gap-1.5">
      <Text className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => onToggle(o.value)}
              className="rounded-full border px-3 py-1.5"
              style={{ borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentTint : "transparent" }}
            >
              <Text className={active ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
