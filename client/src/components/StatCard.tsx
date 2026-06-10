import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { PremiumCard } from "./PremiumCard";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  /** Tailwind text color class for the value/icon, e.g. "text-primary". */
  accent?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <PremiumCard
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={cn("p-4 sm:p-5", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</p>
        {Icon && <Icon className={cn("h-4 w-4 shrink-0", accent ?? "text-muted-foreground")} />}
      </div>
      <p className={cn("mt-2 text-2xl sm:text-3xl font-display font-bold tracking-tight", accent)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </PremiumCard>
  );
}
