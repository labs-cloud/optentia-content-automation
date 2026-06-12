import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Text className="text-xl font-bold text-foreground">This screen doesn't exist.</Text>
        <Link href="/(tabs)" className="text-primary">
          Go to home
        </Link>
      </View>
    </>
  );
}
