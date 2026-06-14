import { FormSheet, Input, PrimaryButton, Screen } from "@/components/ui";
import { useActiveClient, type ClientSummary } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { Check, Pencil, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type Draft = {
  name: string;
  websiteUrl: string;
  industry: string;
  description: string;
  primaryOffer: string;
  audience: string;
};

const empty: Draft = { name: "", websiteUrl: "", industry: "", description: "", primaryOffer: "", audience: "" };

export default function Clients() {
  const { clients, activeClient, setActiveClientId } = useActiveClient();
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();

  // null = closed, "new" = create, number = editing that client id
  const [editing, setEditing] = useState<"new" | number | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);

  const close = () => setEditing(null);
  const refresh = () => utils.clients.list.invalidate();

  const create = trpc.clients.create.useMutation({
    onSuccess: (c) => {
      refresh();
      if (c?.id) setActiveClientId(c.id);
      close();
    },
  });
  const update = trpc.clients.update.useMutation({
    onSuccess: () => {
      refresh();
      close();
    },
  });
  const saving = create.isPending || update.isPending;

  const openNew = () => {
    setDraft(empty);
    setEditing("new");
  };
  const openEdit = (c: ClientSummary) => {
    setDraft({
      name: c.name,
      websiteUrl: c.websiteUrl ?? "",
      industry: c.industry ?? "",
      description: c.description ?? "",
      primaryOffer: c.primaryOffer ?? "",
      audience: c.audience ?? "",
    });
    setEditing(c.id);
  };

  const save = () => {
    const payload = {
      name: draft.name.trim(),
      websiteUrl: draft.websiteUrl.trim() || undefined,
      industry: draft.industry.trim() || undefined,
      description: draft.description.trim() || undefined,
      primaryOffer: draft.primaryOffer.trim() || undefined,
      audience: draft.audience.trim() || undefined,
    };
    if (!payload.name) return;
    if (editing === "new") create.mutate(payload);
    else if (typeof editing === "number") update.mutate({ clientId: editing, ...payload });
  };

  return (
    <Screen>
      <Pressable
        onPress={openNew}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 active:opacity-80"
      >
        <Plus color={colors.accentStrong} size={18} />
        <Text className="font-medium text-foreground">Add client</Text>
      </Pressable>

      {clients.length === 0 ? (
        <Text className="py-6 text-center text-sm text-muted-foreground">
          No clients yet — add your first one above.
        </Text>
      ) : (
        clients.map((c) => {
          const active = activeClient?.id === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => {
                setActiveClientId(c.id);
                router.back();
              }}
              className="rounded-[22px] border border-border bg-surface p-4"
              style={active ? { borderColor: colors.accent } : undefined}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <Text className="font-bold text-primary">{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{c.name}</Text>
                  {c.industry ? <Text className="text-xs text-muted-foreground">{c.industry}</Text> : null}
                </View>
                {active ? <Check color={colors.accent} size={18} /> : null}
                <Pressable onPress={() => openEdit(c)} hitSlop={10} className="ml-1 p-1">
                  <Pencil color={colors.muted} size={16} />
                </Pressable>
              </View>
              {c.description ? (
                <Text className="mt-2 text-sm text-muted-foreground" numberOfLines={2}>
                  {c.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })
      )}

      <FormSheet visible={editing !== null} onClose={close} title={editing === "new" ? "Add client" : "Edit client"}>
        <Input label="Name" value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t })} placeholder="Acme Co." autoCapitalize="words" />
        <Input label="Website" value={draft.websiteUrl} onChangeText={(t) => setDraft({ ...draft, websiteUrl: t })} placeholder="https://…" keyboardType="url" autoCapitalize="none" />
        <Input label="Industry" value={draft.industry} onChangeText={(t) => setDraft({ ...draft, industry: t })} placeholder="e.g. Law firm" />
        <Input label="Primary offer" value={draft.primaryOffer} onChangeText={(t) => setDraft({ ...draft, primaryOffer: t })} placeholder="What they sell" />
        <Input label="Audience" value={draft.audience} onChangeText={(t) => setDraft({ ...draft, audience: t })} placeholder="Who they serve" />
        <Input label="Description" value={draft.description} onChangeText={(t) => setDraft({ ...draft, description: t })} placeholder="One-line summary" multiline />
        <PrimaryButton
          label={editing === "new" ? "Create client" : "Save changes"}
          onPress={save}
          loading={saving}
          disabled={!draft.name.trim()}
          icon={Plus}
        />
      </FormSheet>
    </Screen>
  );
}
