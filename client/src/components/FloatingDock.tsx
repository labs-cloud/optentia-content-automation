import { trpc } from "@/lib/trpc";
import { useClientScope } from "@/contexts/ActiveClientContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  Briefcase,
  CalendarDays,
  CheckSquare,
  Clapperboard,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  MoreHorizontal,
  Settings,
  Sparkles,
  Timer,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { ClientSwitcher } from "./ClientSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type DockItem = { icon: LucideIcon; label: string; path: string; badge?: boolean };

/** The six primary destinations live on the dock. */
const primaryItems: DockItem[] = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: Lightbulb, label: "Brainstorm", path: "/brainstorm" },
  { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { icon: CheckSquare, label: "Content Queue", path: "/queue", badge: true },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

/** Everything else is reachable from the overflow menu. */
const overflowItems: DockItem[] = [
  { icon: Briefcase, label: "Clients", path: "/clients" },
  { icon: Brain, label: "Brand Brain", path: "/brand" },
  { icon: Sparkles, label: "AI Generator", path: "/generate" },
  { icon: FolderOpen, label: "Content Library", path: "/library" },
  { icon: Wifi, label: "Platforms", path: "/platforms" },
  { icon: Timer, label: "Schedules", path: "/schedules" },
  { icon: Clapperboard, label: "HeyGen Videos", path: "/heygen" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const spring = { type: "spring" as const, stiffness: 400, damping: 22 };

function isActivePath(location: string, path: string) {
  return location === path || (path !== "/" && location.startsWith(path));
}

function DockButton({
  item,
  active,
  pending,
  onClick,
}: {
  item: DockItem;
  active: boolean;
  pending?: number;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          whileHover={{ y: -8, scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          transition={spring}
          onClick={onClick}
          aria-label={item.label}
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-[15px] transition-colors",
            active
              ? "bg-[var(--accent-tint)] text-[var(--accent-bright)]"
              : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground",
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.badge && pending ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {pending}
            </span>
          ) : null}
          {active && (
            <motion.span
              layoutId="dock-active-dot"
              transition={spring}
              className="absolute -bottom-1.5 h-[5px] w-[5px] rounded-full bg-[var(--accent-bright)]"
            />
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={10}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

/** Desktop primary navigation: a floating frosted-glass dock, centered bottom. */
export function FloatingDock() {
  const [location, setLocation] = useLocation();
  const { clientId, enabled } = useClientScope();
  const { data: summary } = trpc.analytics.summary.useQuery(
    { clientId },
    { refetchInterval: 30000, enabled },
  );
  const pending = summary?.pending ?? 0;

  const overflowActive = overflowItems.some((i) => isActivePath(location, i.path));

  return (
    <motion.nav
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...spring, delay: 0.1 }}
      className="fixed bottom-[22px] left-1/2 z-50 -translate-x-1/2"
    >
      <div
        className="flex items-center gap-1.5 rounded-[24px] border border-border bg-[var(--surface)] px-2.5 py-2 shadow-[var(--shadow)]"
        style={{ backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)" }}
      >
        {/* Brand mark */}
        <button
          onClick={() => setLocation("/")}
          aria-label="Content Operator home"
          className="ai-grad ai-glow flex h-10 w-10 items-center justify-center rounded-[14px]"
        >
          <Zap className="h-5 w-5 text-white" />
        </button>

        <span className="mx-0.5 h-7 w-px bg-border" aria-hidden />

        {/* Primary destinations */}
        {primaryItems.map((item) => (
          <DockButton
            key={item.path}
            item={item}
            active={isActivePath(location, item.path)}
            pending={pending}
            onClick={() => setLocation(item.path)}
          />
        ))}

        {/* Overflow */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ y: -8, scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  transition={spring}
                  aria-label="More"
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-[15px] transition-colors",
                    overflowActive
                      ? "bg-[var(--accent-tint)] text-[var(--accent-bright)]"
                      : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground",
                  )}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </motion.button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={10}>
              More
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="top" align="center" sideOffset={14} className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">More</DropdownMenuLabel>
            {overflowItems.map((item) => (
              <DropdownMenuItem
                key={item.path}
                className="cursor-pointer gap-2"
                onClick={() => setLocation(item.path)}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="text-xs text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-0.5 h-7 w-px bg-border" aria-hidden />

        {/* Light/dark + client */}
        <ThemeToggle className="hidden lg:inline-flex" />
        <ClientSwitcher compact />
      </div>
    </motion.nav>
  );
}
