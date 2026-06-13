import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * The drifting Frosted Vapor aurora — four soft color blobs behind the frosted
 * panels. A static native approximation of the web CSS aurora (RN has no
 * backdrop-filter); panels render as semi-opaque `surface` fills over this.
 */
export function AuroraBackground() {
  const { theme } = useTheme();
  const canvas = theme === "dark" ? "#0a1322" : "#e7edf6";
  const blobs =
    theme === "dark"
      ? [
          { c: "rgba(95,224,208,0.22)", top: "-10%", left: "-15%" },
          { c: "rgba(90,168,255,0.20)", top: "0%", right: "-20%" },
          { c: "rgba(183,156,245,0.20)", bottom: "-10%", right: "-10%" },
          { c: "rgba(230,206,132,0.14)", bottom: "-5%", left: "-15%" },
        ]
      : [
          // Visible enough to tint the frosted glass, soft enough to stay "light".
          { c: "rgba(120,210,224,0.38)", top: "-10%", left: "-15%" },
          { c: "rgba(132,170,255,0.34)", top: "0%", right: "-20%" },
          { c: "rgba(190,164,250,0.30)", bottom: "-10%", right: "-10%" },
          { c: "rgba(255,206,150,0.26)", bottom: "-5%", left: "-15%" },
        ];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: canvas }]} pointerEvents="none">
      {blobs.map((b, i) => (
        <LinearGradient
          key={i}
          colors={[b.c, "transparent"]}
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: 520,
            top: b.top as never,
            bottom: b.bottom as never,
            left: b.left as never,
            right: b.right as never,
          }}
        />
      ))}
    </View>
  );
}
