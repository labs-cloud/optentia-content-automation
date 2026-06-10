import { useSwipeDeck, type SwipeDirection } from "@/hooks/useSwipeDeck";
import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { ArrowUp, Heart, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "./ui/button";

export type { SwipeDirection };

const SWIPE_X_THRESHOLD = 120;
const SWIPE_UP_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 500;

/**
 * Tinder-style swipe deck.
 *  - drag right = like, left = reject, up = save
 *  - arrow keys ←/→/↑ as a11y fallback
 *  - explicit buttons below the deck for tap users
 */
export function SwipeDeck<T extends { id: number | string }>({
  items,
  renderCard,
  onSwipe,
  onCardTap,
  emptyState,
  className,
}: {
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  onCardTap?: (item: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}) {
  const deck = useSwipeDeck(items, onSwipe);
  // Direction of the in-flight exit animation for the top card.
  const [exitDirection, setExitDirection] = useState<SwipeDirection>("right");

  const commit = useCallback(
    (direction: SwipeDirection) => {
      setExitDirection(direction);
      deck.swipe(direction);
    },
    [deck],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") commit("right");
    else if (e.key === "ArrowLeft") commit("left");
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      commit("up");
    }
  };

  if (deck.isEmpty) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="relative w-full max-w-sm h-[440px] outline-none"
        tabIndex={0}
        role="group"
        aria-label="Idea cards — arrow right to like, left to reject, up to save"
        onKeyDown={handleKeyDown}
      >
        {/* Back-stack cards */}
        {deck.upcoming.map((item, i) => (
          <motion.div
            key={item.id}
            className="absolute inset-0"
            initial={false}
            animate={{ scale: 1 - (i + 1) * 0.045, y: (i + 1) * 12, opacity: 1 - (i + 1) * 0.18 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ zIndex: 10 - i }}
          >
            <div className="h-full pointer-events-none">{renderCard(item)}</div>
          </motion.div>
        ))}

        {/* Top card */}
        <AnimatePresence mode="popLayout">
          {deck.current && (
            <TopCard
              key={deck.current.id}
              exitDirection={exitDirection}
              onCommit={commit}
              onTap={onCardTap ? () => onCardTap(deck.current as T) : undefined}
            >
              {renderCard(deck.current)}
            </TopCard>
          )}
        </AnimatePresence>
      </div>

      {/* Tap fallbacks */}
      <div className="flex items-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          className="h-13 w-13 rounded-2xl border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400"
          style={{ height: 52, width: 52 }}
          onClick={() => commit("left")}
          aria-label="Reject"
        >
          <X className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-2xl border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400"
          onClick={() => commit("up")}
          aria-label="Save for campaign"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-13 w-13 rounded-2xl border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400"
          style={{ height: 52, width: 52 }}
          onClick={() => commit("right")}
          aria-label="Like"
        >
          <Heart className="h-6 w-6" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {deck.remaining} idea{deck.remaining === 1 ? "" : "s"} left · swipe or use ← ↑ →
      </p>
    </div>
  );
}

function TopCard({
  children,
  exitDirection,
  onCommit,
  onTap,
}: {
  children: React.ReactNode;
  exitDirection: SwipeDirection;
  onCommit: (direction: SwipeDirection) => void;
  onTap?: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-13, 13]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);
  const saveOpacity = useTransform(y, [-130, -50], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.y < -SWIPE_UP_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
      onCommit("up");
    } else if (offset.x > SWIPE_X_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
      onCommit("right");
    } else if (offset.x < -SWIPE_X_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
      onCommit("left");
    }
  };

  const exit =
    exitDirection === "up"
      ? { y: -700, opacity: 0, transition: { duration: 0.3 } }
      : exitDirection === "right"
        ? { x: 600, opacity: 0, rotate: 14, transition: { duration: 0.3 } }
        : { x: -600, opacity: 0, rotate: -14, transition: { duration: 0.3 } };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, zIndex: 20, touchAction: "none" }}
      drag
      dragElastic={0.65}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        // Only treat as a tap when the card wasn't dragged.
        if (Math.abs(x.get()) < 4 && Math.abs(y.get()) < 4) onTap?.();
        e.stopPropagation();
      }}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
      exit={exit}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      <div className="relative h-full">
        {children}
        {/* Swipe stamps */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-5 left-5 rotate-[-12deg] rounded-lg border-2 border-emerald-400 px-3 py-1 text-emerald-400 font-display font-bold tracking-widest text-lg bg-background/60 backdrop-blur-sm pointer-events-none"
        >
          LIKE
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-5 right-5 rotate-[12deg] rounded-lg border-2 border-red-400 px-3 py-1 text-red-400 font-display font-bold tracking-widest text-lg bg-background/60 backdrop-blur-sm pointer-events-none"
        >
          PASS
        </motion.div>
        <motion.div
          style={{ opacity: saveOpacity }}
          className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none"
        >
          <span className="rounded-lg border-2 border-blue-400 px-3 py-1 text-blue-400 font-display font-bold tracking-widest text-lg bg-background/60 backdrop-blur-sm">
            SAVE
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
