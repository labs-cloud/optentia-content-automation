import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** Phase-0 placeholder; replaced by the real screen in Phase 1/2. */
export function ScreenPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-2xl font-bold text-foreground">{title}</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">{note}</Text>
      </View>
    </SafeAreaView>
  );
}
