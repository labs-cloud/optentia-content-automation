import { motion } from "framer-motion";
import { Lightbulb, Megaphone, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { MobileSheet } from "./MobileSheet";
import { spring } from "./motion/primitives";

const actions = [
  { icon: Sparkles, label: "Generate a post", description: "AI-write a single post for the active client", path: "/generate" },
  { icon: Lightbulb, label: "Brainstorm ideas", description: "Swipe through fresh idea cards", path: "/brainstorm" },
  { icon: Megaphone, label: "New campaign", description: "Plan a multi-day content campaign", path: "/campaigns?new=1" },
];

/** Mobile quick-create button, floating above the bottom nav. */
export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={spring}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-13 w-13 rounded-2xl bg-primary text-primary-foreground shadow-lg glow-primary flex items-center justify-center"
        style={{ height: 52, width: 52 }}
        aria-label="Create"
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <MobileSheet open={open} onOpenChange={setOpen} title="Create">
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.path}
              onClick={() => {
                setOpen(false);
                setLocation(action.path);
              }}
              className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5 text-left hover:bg-accent/60 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground truncate">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </MobileSheet>
    </>
  );
}
