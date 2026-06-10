import { PLATFORM_CONFIG } from "@/lib/platformUtils";
import { IDEA_TYPE_LABELS, type IdeaType, type Platform } from "@shared/platforms";
import { Lightbulb } from "lucide-react";
import { Badge } from "./ui/badge";

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

/** A single brainstorm idea, styled for the swipe deck. */
export function IdeaCard({ idea }: { idea: IdeaCardData }) {
  const platformConfig = idea.platform ? PLATFORM_CONFIG[idea.platform as Platform] : null;
  const typeLabel = IDEA_TYPE_LABELS[idea.type as IdeaType] ?? idea.type;

  return (
    <div className="h-full rounded-3xl border border-border/60 bg-card glass shadow-lg overflow-hidden flex flex-col select-none">
      <div className="p-5 pb-3 flex items-center justify-between gap-2">
        <Badge variant="outline" className="rounded-lg border-primary/40 text-primary bg-primary/5">
          <Lightbulb className="h-3 w-3 mr-1" />
          {typeLabel}
        </Badge>
        {platformConfig && (
          <Badge variant="outline" className={`rounded-lg ${platformConfig.borderColor} ${platformConfig.color} ${platformConfig.bgColor}`}>
            {platformConfig.icon} {platformConfig.label}
          </Badge>
        )}
      </div>

      <div className="px-5 flex-1 flex flex-col justify-center gap-3 pb-2 min-h-0">
        <h3 className="font-display font-bold text-xl sm:text-2xl leading-snug tracking-tight">
          {idea.hook || idea.title}
        </h3>
        {idea.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">
            {idea.description}
          </p>
        )}
      </div>

      <div className="p-5 pt-3 space-y-1.5 border-t border-border/40">
        {idea.cta && (
          <p className="text-xs text-muted-foreground truncate">
            <span className="text-foreground/80 font-medium">CTA:</span> {idea.cta}
          </p>
        )}
        {idea.contentPillar && (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            {idea.contentPillar.replace(/_/g, " ")}
          </p>
        )}
      </div>
    </div>
  );
}
