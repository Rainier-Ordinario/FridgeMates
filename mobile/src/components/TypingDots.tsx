import { moods, radius, space } from '@/theme';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** Speaker's mood tint for the bubble; the dots use its darker text color. */
  tint?: string;
  dotColor?: string;
}

/** Three 6pt dots bouncing (900ms, staggered 150ms) inside a small bubble while the fridge "types". */
export function TypingDots({ tint = moods.chill.tint, dotColor = moods.chill.text }: Props) {
  return (
    <View style={[styles.bubble, { backgroundColor: tint }]}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} color={dotColor} />
      ))}
    </View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(
      index * 150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [index, reduceMotion, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, -5]) }],
    opacity: interpolate(t.value, [0, 1], [0.5, 1]),
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderBottomLeftRadius: 6,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    height: 40,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
