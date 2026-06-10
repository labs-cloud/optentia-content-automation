import { useEffect, useState } from "react";
import { PremiumCard } from "./PremiumCard";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export type BrandProfileFields = {
  brandSummary: string;
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
};

const SECTIONS: Array<{ key: keyof BrandProfileFields; label: string; hint: string; rows?: number }> = [
  { key: "brandSummary", label: "Brand Summary", hint: "2-3 sentences a ghostwriter could read to instantly get the brand", rows: 3 },
  { key: "voice", label: "Voice", hint: "How the brand sounds — perspective, energy, vocabulary" },
  { key: "tone", label: "Tone", hint: "Emotional register — e.g. direct, warm, calm" },
  { key: "audience", label: "Audience", hint: "Who the content is for" },
  { key: "buyerPains", label: "Buyer Pains", hint: "The audience's most pressing problems" },
  { key: "offers", label: "Offers", hint: "What the brand sells and leads with" },
  { key: "proofPoints", label: "Proof Points", hint: "Credibility: results, experience, differentiators" },
  { key: "competitors", label: "Competitors", hint: "Who they're up against (and contrasted with)" },
  { key: "visualStyle", label: "Visual Style", hint: "Direction for generated graphics — colors, mood, typography" },
  { key: "ctaStyle", label: "CTA Style", hint: "How this brand asks for action" },
  { key: "forbiddenPhrases", label: "Forbidden Phrases", hint: "Clichés and hype words to never use" },
];

const EMPTY: BrandProfileFields = {
  brandSummary: "", voice: "", tone: "", audience: "", buyerPains: "", offers: "",
  proofPoints: "", competitors: "", visualStyle: "", ctaStyle: "", forbiddenPhrases: "",
};

/** Editable sectioned view of the Brand Operating Profile. */
export function BrandProfilePanel({
  profile,
  onSave,
  saving,
}: {
  profile: Partial<Record<keyof BrandProfileFields, string | null>> | null;
  onSave: (fields: BrandProfileFields) => void;
  saving?: boolean;
}) {
  const [fields, setFields] = useState<BrandProfileFields>(EMPTY);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setFields({
      ...EMPTY,
      ...Object.fromEntries(
        SECTIONS.map((s) => [s.key, profile?.[s.key] ?? ""]),
      ),
    } as BrandProfileFields);
    setDirty(false);
  }, [profile]);

  const set = (key: keyof BrandProfileFields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      {SECTIONS.map((section, i) => (
        <PremiumCard key={section.key} className="p-4 sm:p-5" transition={{ delay: i * 0.03 }}>
          <Label htmlFor={`bp-${section.key}`} className="font-display font-semibold">
            {section.label}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">{section.hint}</p>
          <Textarea
            id={`bp-${section.key}`}
            value={fields[section.key]}
            onChange={(e) => set(section.key, e.target.value)}
            rows={section.rows ?? 2}
            placeholder="—"
            className="rounded-xl resize-y"
          />
        </PremiumCard>
      ))}

      <div className="sticky bottom-20 md:bottom-4 flex justify-end">
        <Button
          onClick={() => onSave(fields)}
          disabled={!dirty || saving}
          className="rounded-xl shadow-lg"
          size="lg"
        >
          {saving ? "Saving…" : dirty ? "Save profile" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
