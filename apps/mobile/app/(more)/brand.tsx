import { Card, EmptyHint, Field, Loading, Screen } from "@/components/ui";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClient";
import { trpc } from "@/lib/trpc";
import { Text } from "react-native";

export default function BrandBrain() {
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const profile = trpc.brandProfile.get.useQuery({ clientId }, { enabled });

  if (profile.isLoading) return <Screen><Loading /></Screen>;
  const p = profile.data;
  if (!p) return <Screen><EmptyHint>No Brand Profile yet — generate one on the web.</EmptyHint></Screen>;

  return (
    <Screen>
      <Text className="text-2xl font-bold text-foreground">{activeClient?.name}</Text>
      {p.brandSummary ? <Text className="text-sm text-muted-foreground">{p.brandSummary}</Text> : null}
      <Card>
        <Field label="Voice" value={p.voice} />
        <Field label="Tone" value={p.tone} />
        <Field label="Audience" value={p.audience} />
        <Field label="Buyer pains" value={p.buyerPains} />
        <Field label="Offers" value={p.offers} />
        <Field label="Proof points" value={p.proofPoints} />
        <Field label="Visual style" value={p.visualStyle} />
        <Field label="CTA style" value={p.ctaStyle} />
        <Field label="Forbidden phrases" value={p.forbiddenPhrases} />
      </Card>
    </Screen>
  );
}
