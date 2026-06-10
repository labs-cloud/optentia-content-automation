import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CalendarDays, CheckSquare, Lightbulb, LayoutDashboard, Megaphone } from "lucide-react";
import { useLocation } from "wouter";
import { spring } from "./motion/primitives";

const tabs = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: CheckSquare, label: "Queue", path: "/queue" },
  { icon: Lightbulb, label: "Brainstorm", path: "/brainstorm" },
  { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
];

/** iOS-style bottom tab bar — rendered on mobile only. */
export function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));
          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  transition={spring}
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
                />
              )}
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
