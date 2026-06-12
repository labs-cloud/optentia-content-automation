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
          { c: "rgba(143,224,232,0.55)", top: "-10%", left: "-15%" },
          { c: "rgba(143,182,255,0.50)", top: "0%", right: "-20%" },
          { c: "rgba(199,176,255,0.45)", bottom: "-10%", right: "-10%" },
          { c: "rgba(255,215,176,0.40)", bottom: "-5%", left: "-15%" },
        ];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: canvas }]} pointerEvents="none">
      {blobs.map((b, i) => (
        <LinearGradient
          key={i}
          colors={[b.c, "transparent"]}
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: 360,
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
