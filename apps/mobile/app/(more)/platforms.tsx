import { FormSheet, Input, Loading, PrimaryButton, Screen } from "@/components/ui";
import { useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { PLATFORM_META, type Platform } from "@optentia/core";
import { Link2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

type Draft = { accountName: string; apiKey: string; accessToken: string; pageId: string };
const empty: Draft = { accountName: "", apiKey: "", accessToken: "", pageId: "" };

export default function Platforms() {
  const { clientId, enabled } = useClientScope();
  const c = useColors();
  const utils = trpc.useUtils();
  const platforms = trpc.platforms.list.useQuery({ clientId }, { enabled });

  const [editing, setEditing] = useState<Platform | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);

  const upsert = trpc.platforms.upsert.useMutation();
  const test = trpc.platforms.testConnection.useMutation();
  const saving = upsert.isPending || test.isPending;

  const openEdit = (platform: Platform, accountName?: string | null) => {
    setDraft({ ...empty, accountName: accountName ?? "" });
    setEditing(platform);
  };

  const save = () => {
    if (!editing) return;
    const platform = editing;
    upsert.mutate(
      {
        clientId,
        platform,
        accountName: draft.accountName.trim() || undefined,
        apiKey: draft.apiKey.trim() || undefined,
        accessToken: draft.accessToken.trim() || undefined,
        pageId: draft.pageId.trim() || undefined,
      },
      {
        onSuccess: () => {
          test.mutate(
            { clientId, platform },
            {
              onSettled: () => {
                utils.platforms.list.invalidate();
                setEditing(null);
              },
              onSuccess: (r) => Alert.alert(r.success ? "Connected" : "Connection issue", r.message),
            },
          );
        },
      },
    );
  };

  if (platforms.isLoading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      {platforms.data?.map((p) => {
        const meta = PLATFORM_META[p.platform as Platform];
        const connected = p.status === "connected";
        return (
          <Pressable
            key={p.platform}
            onPress={() => openEdit(p.platform as Platform, p.accountName)}
            className="rounded-[22px] border border-border bg-surface p-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">{meta?.icon ?? "🔌"}</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">{meta?.label ?? p.platform}</Text>
                <Text className="text-xs text-muted-foreground">{p.accountName ?? "Tap to connect"}</Text>
              </View>
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: connected ? "rgba(52,211,153,0.16)" : "rgba(120,140,175,0.16)" }}
              >
                <Text className="font-mono text-[11px]" style={{ color: connected ? c.success : c.muted }}>
                  {connected ? "Connected" : "Not connected"}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      <FormSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Connect ${PLATFORM_META[editing].label}` : "Connect"}
      >
        <Text className="text-sm text-muted-foreground">
          Enter this account's credentials. They're stored against the active client and the connection is tested on save.
        </Text>
        <Input label="Account name" value={draft.accountName} onChangeText={(t) => setDraft({ ...draft, accountName: t })} placeholder="@handle or page name" autoCapitalize="none" />
        <Input label="API key" value={draft.apiKey} onChangeText={(t) => setDraft({ ...draft, apiKey: t })} placeholder="Optional" autoCapitalize="none" />
        <Input label="Access token" value={draft.accessToken} onChangeText={(t) => setDraft({ ...draft, accessToken: t })} placeholder="Optional" autoCapitalize="none" />
        <Input label="Page ID" value={draft.pageId} onChangeText={(t) => setDraft({ ...draft, pageId: t })} placeholder="Optional (Facebook / LinkedIn company)" autoCapitalize="none" />
        <PrimaryButton label="Save & test" icon={Link2} onPress={save} loading={saving} disabled={!enabled} />
      </FormSheet>
    </Screen>
  );
}
