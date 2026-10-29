import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const SIZE = 56;
// The character's feet sit ~10% above the bottom of the Lottie canvas.
const FOOT_OFFSET = SIZE * 0.1;
const SPEED = 38; // px per second
const MARGIN = 8;

/**
 * A little character that strolls along the top edge of the tab bar.
 * Purely decorative: it never blocks touches.
 */
export function TabWalker({ bottom }: { bottom: number }) {
  const { width } = useWindowDimensions();
  const lottie = useRef<LottieView>(null);
  const x = useSharedValue(MARGIN);
  const facing = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      lottie.current?.reset();
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    let pos = x.value;
    const maxX = width - SIZE - MARGIN;

    const rest = () => {
      lottie.current?.pause();
      timer = setTimeout(walk, 1200 + Math.random() * 2800);
    };

    const walk = () => {
      if (!alive) return;
      // Pick a spot at least a quarter-screen away so walks feel purposeful.
      let target = pos;
      while (Math.abs(target - pos) < width * 0.25)
        target = MARGIN + Math.random() * (maxX - MARGIN);
      const duration = (Math.abs(target - pos) / SPEED) * 1000;
      facing.value = target > pos ? 1 : -1;
      lottie.current?.resume();
      x.value = withTiming(target, { duration, easing: Easing.linear });
      pos = target;
      timer = setTimeout(rest, duration);
    };

    lottie.current?.play();
    timer = setTimeout(walk, 800);
    return () => {
      alive = false;
      clearTimeout(timer);
      cancelAnimation(x);
    };
  }, [width, reduceMotion, x, facing]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleX: facing.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.lane, { bottom: bottom - FOOT_OFFSET }]}
    >
      <Animated.View style={[{ width: SIZE, height: SIZE }, style]}>
        <LottieView
          ref={lottie}
          source={require("@/assets/lottie/walker.json")}
          loop
          autoPlay={!reduceMotion}
          style={{ width: SIZE, height: SIZE }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lane: { position: "absolute", left: 0, right: 0, height: SIZE },
});
