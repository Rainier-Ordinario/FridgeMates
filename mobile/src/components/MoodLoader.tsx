import { colors, moods, space } from '@/theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { FoodIcon } from './FoodIcon';

const cycle = [moods.cocky, moods.chill, moods.nervous, moods.dramatic, moods.ghost, moods.cocky];
const cycleColors = cycle.map((m) => m.color);
const cycleTints = cycle.map((m) => m.tint);
const stops = cycle.map((_, i) => i);

const defaultPhrases = ['Scanning your food…'];
const foods = ['Milk', 'Tomato', 'Avocado', 'Cheese', 'Spinach', 'Strawberries', 'Eggs'];

/** Playful loader: a big face that cycles through the mood colors, plus rotating phrases. */
interface Props {
  phrases?: string[];
  sub?: string;
}

export function MoodLoader({ phrases = defaultPhrases, sub = 'this takes a few seconds' }: Props) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    t.value = 0;
    if (!reduceMotion) {
      t.value = withRepeat(
        withTiming(cycle.length - 1, { duration: 2800, easing: Easing.linear }),
        -1,
        false,
      );
    }
    const id = setInterval(() => setTick((n) => n + 1), 550);
    return () => {
      cancelAnimation(t);
      clearInterval(id);
    };
  }, [reduceMotion, t]);

  const circle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, stops, cycleTints),
    borderColor: interpolateColor(t.value, stops, cycleColors),
    transform: [{ scale: 1 + 0.06 * Math.sin(t.value * Math.PI * 2) }],
  }));
  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(t.value, stops, cycleColors),
    transform: [{ scale: interpolate(t.value % 1, [0, 1], [1, 1.45]) }],
    opacity: interpolate(t.value % 1, [0, 1], [0.5, 0]),
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View style={[styles.ring, ring]} />
        <Animated.View style={[styles.circle, circle]}>
          <FoodIcon name={foods[tick % foods.length]} size={72} />
        </Animated.View>
      </View>
      <AppText variant="heading" align="center">
        {phrases[Math.floor(tick / 2) % phrases.length]}
      </AppText>
      <AppText variant="caption" color={colors.inkMuted} align="center">
        {sub}
      </AppText>
    </View>
  );
}

const SIZE = 140;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md },
  stage: { width: SIZE * 1.6, height: SIZE * 1.6, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3 },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
