import { useAuth } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { BarChart3, CalendarDays, CheckSquare, LayoutDashboard, Lightbulb, Megaphone } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { DEV_BYPASS } from "@/lib/env";
import { useTheme } from "@/theme/ThemeProvider";

/** Bottom tab bar mirroring the web BottomNav: Home / Brainstorm / Queue / Campaigns / Calendar. */
export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { theme } = useTheme();

  if (!DEV_BYPASS) {
    if (!isLoaded) return null;
    if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  }

  const active = theme === "dark" ? "#7ee4f0" : "#1f8ea3";
  const inactive = theme === "dark" ? "#a2b4c8" : "#6b7b90";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(120,140,175,0.22)",
          backgroundColor: "transparent",
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={40}
            tint={theme === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="brainstorm"
        options={{ title: "Brainstorm", tabBarIcon: ({ color, size }) => <Lightbulb color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="queue"
        options={{ title: "Queue", tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{ title: "Campaigns", tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: "Calendar", tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
    </Tabs>
  );
}
