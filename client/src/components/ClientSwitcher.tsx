import { useActiveClient } from "@/contexts/ActiveClientContext";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function ClientAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        "h-7 w-7 rounded-lg bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center shrink-0",
        className,
      )}
    >
      {initials || "?"}
    </div>
  );
}

/**
 * Workspace switcher — the app always operates on one active client.
 * `compact` renders avatar-only (collapsed sidebar / mobile top bar).
 */
export function ClientSwitcher({ compact = false }: { compact?: boolean }) {
  const { clients, activeClient, setActiveClientId, isLoading } = useActiveClient();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className={cn("h-9 rounded-lg bg-muted/50 animate-pulse", compact ? "w-9" : "w-full")} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 hover:bg-accent/60 transition-colors text-left focus:outline-none",
            compact ? "p-1" : "w-full px-2 py-1.5",
          )}
          aria-label="Switch client"
        >
          <ClientAvatar name={activeClient?.name ?? "No client"} />
          {!compact && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {activeClient?.name ?? "Select client"}
                </p>
                {activeClient?.industry && (
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    {activeClient.industry}
                  </p>
                )}
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Client workspaces</DropdownMenuLabel>
        {clients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            className="cursor-pointer gap-2"
            onClick={() => setActiveClientId(client.id)}
          >
            <ClientAvatar name={client.name} className="h-6 w-6 text-[10px]" />
            <span className="flex-1 truncate">{client.name}</span>
            {activeClient?.id === client.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        {clients.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground text-center">No clients yet</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setLocation("/clients?new=1")}>
          <Plus className="h-4 w-4" />
          Add client
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setLocation("/clients")}>
          <Settings2 className="h-4 w-4" />
          Manage clients
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
