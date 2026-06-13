import { useTheme } from "@/theme/ThemeProvider";

/**
 * Theme-aware palette for places that can't use NativeWind classes — lucide icon
 * `color` props, `ActivityIndicator`/`RefreshControl` tints, `placeholderTextColor`,
 * and inline `style` colors. Values mirror the CSS tokens in global.css so JS-set
 * colors flip with light/dark exactly like the `var(--…)`-backed classes do.
 *
 * Before this existed every call site hard-coded the dark-mode hex (e.g. `#5fd0de`,
 * `#8a9bb0`), so icons and borders vanished in light mode.
 */
export type Palette = {
  /** Primary accent — check marks, loaders, selected states, refresh tint. */
  accent: string;
  /** Brighter accent — active tab / emphasis. */
  accentStrong: string;
  /** Foreground used ON a filled accent surface (button icon/label). */
  onAccent: string;
  /** Translucent accent fill behind selected pills. */
  accentTint: string;
  /** Body foreground. */
  foreground: string;
  /** Secondary/muted foreground — most icons, placeholders, inactive labels. */
  muted: string;
  /** Highest-contrast foreground. */
  strong: string;
  /** Hairline border / divider. */
  border: string;
  /** Destructive / reject. */
  danger: string;
  /** Status + action accents that read on both themes (kept constant). */
  success: string;
  info: string;
  gold: string;
};

const dark: Palette = {
  accent: "#5fd0de",
  accentStrong: "#7ee4f0",
  onAccent: "#06121f",
  accentTint: "rgba(95,208,222,0.16)",
  foreground: "#eaf2fb",
  muted: "#a2b4c8",
  strong: "#ffffff",
  border: "rgba(255,255,255,0.14)",
  danger: "#ff5b5b",
  success: "#34d399",
  info: "#4f8df5",
  gold: "#e6ce84",
};

const light: Palette = {
  accent: "#2a7a8a",
  accentStrong: "#1f8ea3",
  onAccent: "#ffffff",
  accentTint: "rgba(42,122,138,0.12)",
  foreground: "#233246",
  muted: "#6b7b90",
  strong: "#0e1b2c",
  border: "rgba(120,140,175,0.32)",
  danger: "#ef4444",
  success: "#1f9d6b",
  info: "#3a73e0",
  gold: "#b8923a",
};

export function getColors(theme: "light" | "dark"): Palette {
  return theme === "dark" ? dark : light;
}

/** Hook form for components inside the ThemeProvider. */
export function useColors(): Palette {
  const { theme } = useTheme();
  return getColors(theme);
}
