import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

/** Stack for secondary screens, with a themed header + native back. */
export default function MoreLayout() {
  const { theme } = useTheme();
  const bg = theme === "dark" ? "#0a1322" : "#e7edf6";
  const fg = theme === "dark" ? "#eaf2fb" : "#233246";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: bg },
        headerTintColor: fg,
        headerTitleStyle: { fontFamily: "Sora_600SemiBold" },
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="menu" options={{ title: "More" }} />
      <Stack.Screen name="clients" options={{ title: "Clients" }} />
      <Stack.Screen name="brand" options={{ title: "Brand Brain" }} />
      <Stack.Screen name="generate" options={{ title: "AI Generator" }} />
      <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
      <Stack.Screen name="library" options={{ title: "Content Library" }} />
      <Stack.Screen name="platforms" options={{ title: "Platforms" }} />
      <Stack.Screen name="schedules" options={{ title: "Schedules" }} />
      <Stack.Screen name="heygen" options={{ title: "HeyGen Videos" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="campaign/[id]" options={{ title: "Campaign" }} />
    </Stack>
  );
}
