import { useUser } from "@clerk/clerk-expo";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";

/**
 * Dashboard (Phase 0). Proves the full native stack end-to-end: Clerk session →
 * bearer token → authenticated tRPC query against the existing server.
 */
export default function Dashboard() {
  const { user } = useUser();
  const clients = trpc.clients.list.useQuery();

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
        <Text className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Workspace
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">
          {user?.firstName ? `Hi, ${user.firstName}` : "Dashboard"}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Your client workspaces, live from the API.
        </Text>

        <View className="mt-6 rounded-[22px] border border-border bg-surface p-5">
          {clients.isLoading ? (
            <ActivityIndicator />
          ) : clients.error ? (
            <Text className="text-sm text-destructive">
              Couldn't load clients: {clients.error.message}
            </Text>
          ) : (clients.data?.length ?? 0) === 0 ? (
            <Text className="text-sm text-muted-foreground">
              No clients yet — add one on the web to see it here.
            </Text>
          ) : (
            <View className="gap-3">
              <Text className="font-mono text-[11px] uppercase tracking-widest text-accent-bright">
                {clients.data?.length} client{clients.data?.length === 1 ? "" : "s"}
              </Text>
              {clients.data?.map((c) => (
                <View key={c.id} className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                    <Text className="font-semibold text-primary">
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-medium text-foreground">{c.name}</Text>
                    {c.industry ? (
                      <Text className="text-xs text-muted-foreground">{c.industry}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
