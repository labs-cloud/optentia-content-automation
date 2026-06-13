import { useActiveClient } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { Check, ChevronsUpDown } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

/** Header pill that opens a sheet to switch the active client workspace. */
export function ClientSwitcher() {
  const { clients, activeClient, setActiveClientId } = useActiveClient();
  const [open, setOpen] = useState(false);
  const colors = useColors();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5"
      >
        <View className="h-6 w-6 items-center justify-center rounded-lg bg-primary/15">
          <Text className="text-[11px] font-semibold text-primary">
            {(activeClient?.name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="max-w-[120px] text-sm font-medium text-foreground" numberOfLines={1}>
          {activeClient?.name ?? "Select client"}
        </Text>
        <ChevronsUpDown size={14} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <View className="rounded-t-[24px] border-t border-border bg-background p-4 pb-8">
            <Text className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Client workspaces
            </Text>
            {clients.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setActiveClientId(c.id);
                  setOpen(false);
                }}
                className="flex-row items-center gap-3 rounded-xl px-2 py-3 active:bg-surface"
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <Text className="text-sm font-semibold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="flex-1 text-foreground">{c.name}</Text>
                {activeClient?.id === c.id ? <Check size={18} color={colors.accent} /> : null}
              </Pressable>
            ))}
            {clients.length === 0 ? (
              <Text className="py-4 text-center text-sm text-muted-foreground">
                No clients yet — add one on the web.
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
