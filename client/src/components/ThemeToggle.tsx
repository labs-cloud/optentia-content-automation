import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

/**
 * Frosted Vapor light/dark switch — a glass pill whose thumb springs across.
 * Swaps the whole UI between "Frosted Vapor · Dark" and "Frosted Vapor · Light".
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex h-8 w-[66px] items-center rounded-full border border-border bg-secondary/60 px-1 backdrop-blur transition-colors",
        className,
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm",
          isDark ? "ml-0" : "ml-auto",
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </motion.span>
    </button>
  );
}
