import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = [
  "Reading the brand profile…",
  "Studying what you've liked before…",
  "Drafting angles…",
  "Sharpening the hooks…",
  "Almost there…",
];

/** Shown while a generation mutation is pending — makes the wait feel alive. */
export function AIThinkingState({
  messages = DEFAULT_MESSAGES,
  label,
}: {
  messages?: string[];
  label?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="h-14 w-14 rounded-2xl bg-primary/15 glow-primary flex items-center justify-center mb-5"
      >
        <Sparkles className="h-7 w-7 text-primary" />
      </motion.div>
      {label && <p className="font-display font-semibold mb-1">{label}</p>}
      <div className="h-5 relative w-full max-w-xs">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground absolute inset-x-0"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-6 w-full max-w-xs h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full w-1/3 rounded-full bg-primary/70"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
