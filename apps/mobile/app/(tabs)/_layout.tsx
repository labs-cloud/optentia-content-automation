import { useAuth } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { BarChart3, CalendarDays, CheckSquare, LayoutDashboard, Lightbulb, Megaphone } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEV_BYPASS } from "@/lib/env";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Floating frosted dock (mirrors the web's floating nav): a detached, rounded
 * pill — margins on every side, a real BlurView frost, a border and a drop
 * shadow — so it floats over the aurora instead of sitting flush and invisible.
 */
export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!DEV_BYPASS) {
    if (!isLoaded) return null;
    if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  }

  const dark = theme === "dark";
  const active = dark ? "#7ee4f0" : "#1f8ea3";
  const inactive = dark ? "#a2b4c8" : "#6b7b90";
  const border = dark ? "rgba(126,228,240,0.28)" : "rgba(120,140,175,0.38)";

  return (
    <Tabs
      // Without this the tab navigator paints an opaque white scene over the
      // aurora, so tab screens render white even in dark mode.
      sceneContainerStyle={{ backgroundColor: "transparent" }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: { fontSize: 10, fontFamily: "DMMono_400Regular", marginTop: 2 },
        tabBarItemStyle: { paddingTop: 10 },
        // The bar itself is transparent + shadowed; the rounded frosted fill is
        // a separate clipped layer below, so the shadow isn't clipped away.
        tabBarStyle: {
          position: "absolute",
          left: 22,
          right: 22,
          bottom: Math.max(insets.bottom, 18),
          height: 66,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          shadowColor: dark ? "#000000" : "#1b2a44",
          shadowOpacity: dark ? 0.55 : 0.22,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 14 },
        },
        tabBarBackground: () => (
          <View
            style={[StyleSheet.absoluteFill, { borderRadius: 33, overflow: "hidden", borderWidth: 1, borderColor: border }]}
          >
            <BlurView
              intensity={dark ? 30 : 48}
              tint={dark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <View className="bg-surface-2" style={StyleSheet.absoluteFill} />
          </View>
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
