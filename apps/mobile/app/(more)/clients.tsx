import { Screen, EmptyHint } from "@/components/ui";
import { useActiveClient } from "@/contexts/ActiveClient";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export default function Clients() {
  const { clients, activeClient, setActiveClientId } = useActiveClient();
  const router = useRouter();

  if (clients.length === 0) return <Screen><EmptyHint>No clients yet — add one on the web.</EmptyHint></Screen>;

  return (
    <Screen>
      {clients.map((c) => {
        const active = activeClient?.id === c.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => {
              setActiveClientId(c.id);
              router.back();
            }}
            className="rounded-[22px] border border-border bg-surface p-4"
            style={active ? { borderColor: "#5fd0de" } : undefined}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Text className="font-bold text-primary">{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{c.name}</Text>
                {c.industry ? <Text className="text-xs text-muted-foreground">{c.industry}</Text> : null}
              </View>
              {active ? <Check color="#5fd0de" size={18} /> : null}
            </View>
            {c.description ? (
              <Text className="mt-2 text-sm text-muted-foreground" numberOfLines={2}>
                {c.description}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </Screen>
  );
}
