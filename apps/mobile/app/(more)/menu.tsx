import { Screen } from "@/components/ui";
import { useRouter } from "expo-router";
import {
  BarChart3,
  Brain,
  Briefcase,
  ChevronRight,
  Clapperboard,
  FolderOpen,
  Settings,
  Sparkles,
  Timer,
  Wifi,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

const ITEMS: { icon: LucideIcon; label: string; path: string }[] = [
  { icon: Briefcase, label: "Clients", path: "/(more)/clients" },
  { icon: Brain, label: "Brand Brain", path: "/(more)/brand" },
  { icon: Sparkles, label: "AI Generator", path: "/(more)/generate" },
  { icon: BarChart3, label: "Analytics", path: "/(more)/analytics" },
  { icon: FolderOpen, label: "Content Library", path: "/(more)/library" },
  { icon: Wifi, label: "Platforms", path: "/(more)/platforms" },
  { icon: Timer, label: "Schedules", path: "/(more)/schedules" },
  { icon: Clapperboard, label: "HeyGen Videos", path: "/(more)/heygen" },
  { icon: Settings, label: "Settings", path: "/(more)/settings" },
];

export default function Menu() {
  const router = useRouter();
  return (
    <Screen>
      <View className="overflow-hidden rounded-[22px] border border-border bg-surface">
        {ITEMS.map((item, i) => (
          <Pressable
            key={item.path}
            onPress={() => router.push(item.path as never)}
            className="flex-row items-center gap-3 px-4 py-3.5 active:bg-surface-2"
            style={i > 0 ? { borderTopWidth: 1, borderTopColor: "rgba(120,140,175,0.16)" } : undefined}
          >
            <item.icon color="#8a9bb0" size={18} />
            <Text className="flex-1 text-foreground">{item.label}</Text>
            <ChevronRight color="#8a9bb0" size={18} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
