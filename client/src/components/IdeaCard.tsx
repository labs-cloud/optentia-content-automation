import { IDEA_TYPE_LABELS, type IdeaType } from "@shared/platforms";
import { Sparkles } from "lucide-react";

export type IdeaCardData = {
  id: number;
  type: string;
  title: string | null;
  hook: string | null;
  description: string | null;
  platform: string | null;
  contentPillar: string | null;
  visualConcept: string | null;
  cta: string | null;
};

/** Deterministic gradient per idea type, mirroring the prototype's idea art. */
const IDEA_GRADS = [
  "linear-gradient(135deg,#2DD4BF,#2A7A8A 70%,#1E5A66)",
  "linear-gradient(135deg,#FFB36B,#E8635B 70%,#B0394F)",
  "linear-gradient(135deg,#9A7BF0,#5A6BE0 60%,#3A4FB0)",
  "linear-gradient(135deg,#FF8A8A,#C9468B 60%,#7A3FA0)",
  "linear-gradient(135deg,#5BD6A0,#10B981 70%,#0E7C5A)",
];
function gradFor(id: number): string {
  return IDEA_GRADS[Math.abs(id) % IDEA_GRADS.length];
}

/** A single brainstorm idea, styled for the swipe deck (prototype "idea-card"). */
export function IdeaCard({ idea }: { idea: IdeaCardData }) {
  const typeLabel = IDEA_TYPE_LABELS[idea.type as IdeaType] ?? idea.type;
  const pillar = idea.contentPillar?.replace(/_/g, " ") ?? typeLabel;
  const chips = [typeLabel, idea.platform?.replace(/_/g, " ")].filter(Boolean) as string[];

  return (
    <div className="idea-card">
      <div className="idea-img">
        <div className="grad" style={{ background: gradFor(idea.id) }} />
        <span className="pillar">{pillar}</span>
        <span className="aibadge">
          <Sparkles /> AI idea
        </span>
      </div>
      <div className="idea-body">
        <div className="idea-title">{idea.hook || idea.title}</div>
        {idea.description && <div className="idea-desc">{idea.description}</div>}
        <div className="idea-foot">
          {chips.map((c) => (
            <span className="chip" key={c}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
