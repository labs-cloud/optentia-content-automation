import { Card, FormSheet, Input, Loading, PrimaryButton, Screen } from "@/components/ui";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { useColors } from "@/theme/colors";
import { trpc } from "@/lib/trpc";
import { Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

type BP = {
  voice: string;
  tone: string;
  audience: string;
  buyerPains: string;
  offers: string;
  proofPoints: string;
  competitors: string;
  visualStyle: string;
  ctaStyle: string;
  forbiddenPhrases: string;
  brandSummary: string;
};

const emptyBP: BP = {
  voice: "", tone: "", audience: "", buyerPains: "", offers: "", proofPoints: "",
  competitors: "", visualStyle: "", ctaStyle: "", forbiddenPhrases: "", brandSummary: "",
};

export default function BrandBrain() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const c = useColors();
  const utils = trpc.useUtils();
  const profile = trpc.brandProfile.get.useQuery({ clientId }, { enabled });

  const [form, setForm] = useState<BP>(emptyBP);
  const [genOpen, setGenOpen] = useState(false);
  const [sourceText, setSourceText] = useState("");

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      voice: p.voice ?? "", tone: p.tone ?? "", audience: p.audience ?? "", buyerPains: p.buyerPains ?? "",
      offers: p.offers ?? "", proofPoints: p.proofPoints ?? "", competitors: p.competitors ?? "",
      visualStyle: p.visualStyle ?? "", ctaStyle: p.ctaStyle ?? "", forbiddenPhrases: p.forbiddenPhrases ?? "",
      brandSummary: p.brandSummary ?? "",
    });
  }, [profile.data]);

  const save = trpc.brandProfile.update.useMutation({ onSuccess: () => utils.brandProfile.get.invalidate() });
  const generate = trpc.brandProfile.generateBrandProfile.useMutation({
    onSuccess: () => {
      utils.brandProfile.get.invalidate();
      setGenOpen(false);
      setSourceText("");
    },
  });

  if (profile.isLoading) return <Screen><Loading /></Screen>;

  const set = (k: keyof BP) => (t: string) => setForm((f) => ({ ...f, [k]: t }));

  return (
    <Screen>
      <Text className="text-2xl font-bold text-foreground">{activeClient?.name}</Text>

      <Pressable
        onPress={() => setGenOpen(true)}
        disabled={!enabled}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 active:opacity-80"
      >
        <Sparkles color={c.accentStrong} size={18} />
        <Text className="font-medium text-foreground">{profile.data ? "Regenerate with AI" : "Generate with AI"}</Text>
      </Pressable>

      <Card>
        <View className="gap-3.5">
          <Input label="Brand summary" value={form.brandSummary} onChangeText={set("brandSummary")} multiline placeholder="One-paragraph overview" />
          <Input label="Voice" value={form.voice} onChangeText={set("voice")} multiline />
          <Input label="Tone" value={form.tone} onChangeText={set("tone")} />
          <Input label="Audience" value={form.audience} onChangeText={set("audience")} multiline />
          <Input label="Buyer pains" value={form.buyerPains} onChangeText={set("buyerPains")} multiline />
          <Input label="Offers" value={form.offers} onChangeText={set("offers")} multiline />
          <Input label="Proof points" value={form.proofPoints} onChangeText={set("proofPoints")} multiline />
          <Input label="Competitors" value={form.competitors} onChangeText={set("competitors")} />
          <Input label="Visual style" value={form.visualStyle} onChangeText={set("visualStyle")} multiline />
          <Input label="CTA style" value={form.ctaStyle} onChangeText={set("ctaStyle")} />
          <Input label="Forbidden phrases" value={form.forbiddenPhrases} onChangeText={set("forbiddenPhrases")} />
          <PrimaryButton
            label="Save brand profile"
            onPress={() => save.mutate({ clientId, ...form })}
            loading={save.isPending}
            disabled={!enabled}
          />
        </View>
      </Card>

      <FormSheet visible={genOpen} onClose={() => setGenOpen(false)} title="Generate Brand Brain">
        <Text className="text-sm text-muted-foreground">
          The AI builds the brand profile from this client's info. Paste any extra source material
          (website copy, about text, positioning notes) to sharpen it.
        </Text>
        <Input
          label="Source text (optional)"
          value={sourceText}
          onChangeText={setSourceText}
          multiline
          placeholder="Paste website copy, positioning, notes…"
        />
        <PrimaryButton
          label="Generate"
          icon={Sparkles}
          onPress={() => generate.mutate({ clientId, sourceText: sourceText.trim() || undefined })}
          loading={generate.isPending}
          disabled={!enabled}
        />
      </FormSheet>
    </Screen>
  );
}
