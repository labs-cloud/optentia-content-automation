import { Glass } from "@/components/ui";
import { useColors } from "@/theme/colors";
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
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

/** The "More" tab: entry point to every secondary (client-scoped) screen. */
export default function More() {
  const router = useRouter();
  const c = useColors();
  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130 }}>
        <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Workspace
        </Text>
        <Text className="mb-4 mt-1 text-3xl font-bold text-foreground">More</Text>
        <Glass>
          {ITEMS.map((item, i) => (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as never)}
              className="flex-row items-center gap-3 px-4 py-3.5 active:bg-surface-2"
              style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : undefined}
            >
              <item.icon color={c.muted} size={18} />
              <Text className="flex-1 text-foreground">{item.label}</Text>
              <ChevronRight color={c.muted} size={18} />
            </Pressable>
          ))}
        </Glass>
      </ScrollView>
    </SafeAreaView>
  );
}
