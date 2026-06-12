import { LinearGradient } from "expo-linear-gradient";
import type { ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * The reserved iridescent AI gradient (--ai-grad). Use ONLY for AI moments
 * (Brand Brain, Generate buttons, AI badges) — never as a generic background.
 */
export function AIGradient({
  style,
  borderRadius = 14,
  children,
}: {
  style?: ViewStyle;
  borderRadius?: number;
  children?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors =
    theme === "dark"
      ? (["#5fe0d0", "#5aa8ff", "#b79cf5", "#e6ce84"] as const)
      : (["#8fe0e8", "#8fb6ff", "#c7b0ff", "#ffd7b0"] as const);

  return (
    <LinearGradient
      colors={colors}
      locations={[0, 0.44, 0.72, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius }, style]}
    >
      {children}
    </LinearGradient>
  );
}
