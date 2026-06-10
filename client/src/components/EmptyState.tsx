import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { FadeIn } from "./motion/primitives";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <FadeIn className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      )}
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">{description}</p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>{secondaryActionLabel}</Button>
          )}
        </div>
      )}
    </FadeIn>
  );
}
