import { vars } from "nativewind";

/**
 * Theme tokens bound to the app's OWN theme state via NativeWind `vars()`,
 * applied to a root View so every `var(--…)`-backed class resolves to these.
 *
 * Why not the `.dark {}` selector in global.css: that tracks NativeWind's color
 * scheme, which can follow the device/simulator *system* appearance rather than
 * our in-app toggle — so "dark mode" rendered with the light tokens (white).
 * Setting the variables inline removes that ambiguity entirely.
 */
const light = vars({
  "--canvas": "#e7edf6",
  "--background": "#e7edf6",
  "--foreground": "#233246",
  "--surface": "rgba(255,255,255,0.55)",
  "--surface-2": "rgba(255,255,255,0.72)",
  "--surface-solid": "#ffffff",
  "--card": "rgba(255,255,255,0.55)",
  "--primary": "#2a7a8a",
  "--primary-foreground": "#ffffff",
  "--accent-bright": "#1f8ea3",
  "--accent-tint": "rgba(42,122,138,0.12)",
  "--border": "rgba(120,140,175,0.40)",
  "--muted": "rgba(120,140,175,0.10)",
  "--muted-foreground": "#6b7b90",
  "--text-strong": "#0e1b2c",
  "--gold": "#b8923a",
  "--destructive": "#ef4444",
});

const dark = vars({
  "--canvas": "#0a1322",
  "--background": "#0a1322",
  "--foreground": "#eaf2fb",
  "--surface": "rgba(255,255,255,0.07)",
  "--surface-2": "rgba(255,255,255,0.12)",
  "--surface-solid": "#1a2333",
  "--card": "rgba(255,255,255,0.07)",
  "--primary": "#5fd0de",
  "--primary-foreground": "#06121f",
  "--accent-bright": "#7ee4f0",
  "--accent-tint": "rgba(95,208,222,0.16)",
  "--border": "rgba(255,255,255,0.14)",
  "--muted": "rgba(255,255,255,0.06)",
  "--muted-foreground": "#a2b4c8",
  "--text-strong": "#ffffff",
  "--gold": "#e6ce84",
  "--destructive": "#ff5b5b",
});

export function themeVars(theme: "light" | "dark") {
  return theme === "dark" ? dark : light;
}
