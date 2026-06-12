/** @type {import('tailwindcss').Config} */
// Frosted Vapor — ported from client/src/index.css. Colors resolve to CSS
// variables defined in global.css (:root = opal/light, .dark = vapor), so light
// and dark switch via NativeWind's colorScheme just like the web app.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-solid": "var(--surface-solid)",
        card: "var(--card)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        "accent-bright": "var(--accent-bright)",
        "accent-tint": "var(--accent-tint)",
        border: "var(--border)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        "text-strong": "var(--text-strong)",
        gold: "var(--gold)",
        destructive: "var(--destructive)",
        "status-pending": "#F59E0B",
        "status-scheduled": "#6AA0F5",
        "status-approved": "#34D399",
      },
      fontFamily: {
        sans: ["Sora_400Regular"],
        medium: ["Sora_500Medium"],
        semibold: ["Sora_600SemiBold"],
        bold: ["Sora_700Bold"],
        mono: ["DMMono_400Regular"],
        serif: ["PlayfairDisplay_600SemiBold"],
      },
      borderRadius: {
        md: "16px",
        lg: "22px",
        xl: "28px",
      },
    },
  },
  plugins: [],
};
