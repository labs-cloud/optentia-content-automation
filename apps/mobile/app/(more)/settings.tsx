import { Card, Field, Screen } from "@/components/ui";
import { useColors } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { LogOut, Moon, Sun } from "lucide-react-native";
import { Pressable, Switch, Text, View } from "react-native";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const c = useColors();

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  return (
    <Screen>
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {theme === "dark" ? <Moon size={18} color={c.muted} /> : <Sun size={18} color={c.muted} />}
            <Text className="text-sm font-medium text-foreground">
              Frosted Vapor · {theme === "dark" ? "Dark" : "Light"}
            </Text>
          </View>
          <Switch
            testID="theme-toggle"
            accessibilityLabel="Toggle dark mode"
            value={theme === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ true: "#2a7a8a", false: "#c3ccd9" }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>

      <Card>
        <Field label="Name" value={user?.fullName ?? user?.firstName ?? "—"} />
        <View className="h-2" />
        <Field label="Email" value={user?.primaryEmailAddress?.emailAddress ?? "—"} />
      </Card>

      <Pressable
        onPress={onSignOut}
        style={{ borderColor: c.danger }}
        className="flex-row items-center justify-center gap-2 rounded-xl border py-3 active:opacity-80"
      >
        <LogOut size={16} color={c.danger} />
        <Text className="font-medium" style={{ color: c.danger }}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}
