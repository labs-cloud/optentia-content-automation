import { useSwipeDeck, type SwipeDirection } from "@optentia/core";
import { Heart, X, ArrowUp } from "lucide-react-native";
import { type ReactNode } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type { SwipeDirection };

const { width } = Dimensions.get("window");
const SWIPE_X = width * 0.28;
const SWIPE_UP = 130;

/**
 * Native Tinder swipe deck — Gesture Handler + Reanimated for the gesture layer,
 * reusing the shared `useSwipeDeck` state machine from @optentia/core (same
 * "which card / what swipe / next" logic as the web deck).
 */
export function SwipeDeck<T extends { id: number | string }>({
  items,
  renderCard,
  onSwipe,
  onCardTap,
  emptyState,
}: {
  items: T[];
  renderCard: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  onCardTap?: (item: T) => void;
  emptyState?: ReactNode;
}) {
  const deck = useSwipeDeck(items, onSwipe);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const commit = (dir: SwipeDirection) => {
    deck.swipe(dir);
    tx.value = 0;
    ty.value = 0;
  };

  const fling = (dir: SwipeDirection) => {
    if (dir === "up") {
      tx.value = withTiming(0, { duration: 240 });
      ty.value = withTiming(-900, { duration: 260 }, (done) => {
        if (done) runOnJS(commit)("up");
      });
    } else {
      const toX = dir === "right" ? width * 1.5 : -width * 1.5;
      ty.value = withTiming(ty.value, { duration: 260 });
      tx.value = withTiming(toX, { duration: 260 }, (done) => {
        if (done) runOnJS(commit)(dir);
      });
    }
  };

  const tapFor = (item: T) =>
    Gesture.Tap().maxDistance(8).onEnd(() => {
      if (onCardTap) runOnJS(onCardTap)(item);
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY < -SWIPE_UP || e.velocityY < -900) {
        runOnJS(fling)("up");
      } else if (e.translationX > SWIPE_X || e.velocityX > 800) {
        runOnJS(fling)("right");
      } else if (e.translationX < -SWIPE_X || e.velocityX < -800) {
        runOnJS(fling)("left");
      } else {
        tx.value = withTiming(0, { duration: 200 });
        ty.value = withTiming(0, { duration: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-width, width], [-12, 12], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, 120], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-120, -20], [1, 0], Extrapolation.CLAMP),
  }));
  const saveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ty.value, [-120, -40], [1, 0], Extrapolation.CLAMP),
  }));

  if (deck.isEmpty) return <View className="items-center justify-center py-10">{emptyState}</View>;

  return (
    <View className="items-center">
      <View style={{ width: "100%", maxWidth: 360, height: 460 }}>
        {/* Back-stack */}
        {deck.upcoming.map((item, i) => (
          <View
            key={item.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ scale: 1 - (i + 1) * 0.045 }, { translateY: (i + 1) * 12 }],
              opacity: 1 - (i + 1) * 0.18,
              zIndex: 10 - i,
            }}
          >
            {renderCard(item)}
          </View>
        ))}

        {/* Top card */}
        {deck.current && (
          <GestureDetector gesture={Gesture.Race(pan, tapFor(deck.current))}>
            <Animated.View
              style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }, cardStyle]}
            >
              {renderCard(deck.current)}
              <Animated.View style={[stamp("#34D399", { top: 20, left: 18, rotate: "-12deg" }), likeStyle]}>
                <Text style={{ fontSize: 18, fontWeight: "700", letterSpacing: 2, color: "#34D399" }}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[stamp("#FF5B5B", { top: 20, right: 18, rotate: "12deg" }), passStyle]}>
                <Text style={{ fontSize: 18, fontWeight: "700", letterSpacing: 2, color: "#FF5B5B" }}>PASS</Text>
              </Animated.View>
              <Animated.View style={[stamp("#4F8DF5", { bottom: 28, alignSelf: "center" }), saveStyle]}>
                <Text style={{ fontSize: 18, fontWeight: "700", letterSpacing: 2, color: "#4F8DF5" }}>SAVE</Text>
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      {/* Tap fallbacks */}
      <View className="mt-6 flex-row items-center gap-4">
        <DeckButton color="#FF5B5B" onPress={() => fling("left")}>
          <X color="#FF5B5B" size={24} />
        </DeckButton>
        <DeckButton color="#4F8DF5" small onPress={() => fling("up")}>
          <ArrowUp color="#4F8DF5" size={20} />
        </DeckButton>
        <DeckButton color="#34D399" onPress={() => fling("right")}>
          <Heart color="#34D399" size={24} />
        </DeckButton>
      </View>
      <Text className="mt-3 font-mono text-xs text-muted-foreground">
        {deck.remaining} idea{deck.remaining === 1 ? "" : "s"} left · swipe or tap
      </Text>
    </View>
  );
}

function stamp(
  color: string,
  pos: { top?: number; left?: number; right?: number; bottom?: number; alignSelf?: "center"; rotate?: string },
): import("react-native").ViewStyle {
  const { rotate, ...rest } = pos;
  return {
    position: "absolute",
    borderWidth: 2,
    borderColor: color,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: rotate ? [{ rotate }] : undefined,
    ...rest,
  };
}

function DeckButton({
  children,
  color,
  small,
  onPress,
}: {
  children: ReactNode;
  color: string;
  small?: boolean;
  onPress: () => void;
}) {
  const size = small ? 46 : 54;
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: size,
        width: size,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Pressable>
  );
}
