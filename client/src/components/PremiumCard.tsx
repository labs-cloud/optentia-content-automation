import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { softSpring } from "./motion/primitives";

type PremiumCardProps = HTMLMotionProps<"div"> & {
  /** Adds the primary glow treatment for hero/highlight cards. */
  glow?: boolean;
  /** Lifts slightly on hover — use for clickable cards. */
  interactive?: boolean;
};

/**
 * The app's base surface: iOS-style large radius, subtle border, soft elevation.
 */
export function PremiumCard({ className, glow, interactive, children, ...props }: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      whileHover={interactive ? { y: -2 } : undefined}
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm",
        glow && "glow-primary border-primary/30",
        interactive && "cursor-pointer transition-colors hover:border-border",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
