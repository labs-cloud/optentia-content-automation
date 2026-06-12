import { useCallback, useState } from "react";

export type SwipeDirection = "left" | "right" | "up";

/**
 * Deck state machine, kept separate from the gesture/animation layer so the web
 * (framer-motion) and native (Reanimated + Gesture Handler) decks reuse it
 * unchanged. Mirrors client/src/hooks/useSwipeDeck.ts — keep them in sync, or
 * have the web copy re-export from here.
 */
export function useSwipeDeck<T>(
  items: T[],
  onSwipe: (item: T, direction: SwipeDirection) => void,
) {
  const [cursor, setCursor] = useState(0);

  const current = items[cursor] ?? null;
  const upcoming = items.slice(cursor + 1, cursor + 3);
  const remaining = Math.max(items.length - cursor, 0);

  const swipe = useCallback(
    (direction: SwipeDirection) => {
      const item = items[cursor];
      if (!item) return;
      onSwipe(item, direction);
      setCursor((c) => c + 1);
    },
    [items, cursor, onSwipe],
  );

  const reset = useCallback(() => setCursor(0), []);

  return { current, upcoming, remaining, isEmpty: current === null, swipe, reset };
}
