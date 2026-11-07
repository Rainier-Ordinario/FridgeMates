import { colors, moods, type Mood } from '@/theme';
import { useEffect } from 'react';
import {
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

/**
 * One looping shared value (0 → 1 → 0) per character, interpreted per mood:
 *  breathe: scale   · bob: translateY · wobble: rotate · shake: translateX · float: translateY
 * When Reduce Motion is on, everything is static.
 */
const timing: Record<Mood, { duration: number; easing: (t: number) => number }> = {
  cocky: { duration: 1600, easing: Easing.inOut(Easing.sin) },
  chill: { duration: 2200, easing: Easing.inOut(Easing.sin) },
  nervous: { duration: 220, easing: Easing.inOut(Easing.quad) },
  dramatic: { duration: 70, easing: Easing.linear },
  ghost: { duration: 1400, easing: Easing.inOut(Easing.sin) },
};

export function useMoodMotion(mood: Mood, highlight = false) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(t);
    cancelAnimation(pulse);
    t.value = 0;
    pulse.value = 0;
    if (reduceMotion) return;
    const { duration, easing } = timing[mood];
    t.value = withRepeat(withTiming(1, { duration, easing }), -1, true);
    if (mood === 'dramatic') {
      pulse.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), -1, true);
    }
    return () => {
      cancelAnimation(t);
      cancelAnimation(pulse);
    };
  }, [mood, reduceMotion, t, pulse]);

  const motion = moods[mood].motion;

  const faceStyle = useAnimatedStyle(() => {
    switch (motion) {
      case 'breathe':
        return { transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.04]) }] };
      case 'bob':
        return { transform: [{ translateY: interpolate(t.value, [0, 1], [-2, 2]) }] };
      case 'wobble':
        return { transform: [{ rotate: `${interpolate(t.value, [0, 1], [-4, 4])}deg` }] };
      case 'shake':
        return { transform: [{ translateX: interpolate(t.value, [0, 1], [-3, 3]) }] };
      case 'float':
        return {
          transform: [{ translateY: interpolate(t.value, [0, 1], [-8, 8]) }],
          opacity: interpolate(t.value, [0, 1], [0.45, 0.75]),
        };
    }
  });

  /** Pulsing red border for dramatic, brand border for freshly scanned items, transparent otherwise. */
  const borderStyle = useAnimatedStyle(() => {
    if (motion !== 'shake') return { borderColor: highlight ? colors.brand : moods[mood].color };
    return { borderColor: interpolateColor(pulse.value, [0, 1], ['rgba(229,72,58,0.35)', colors.danger]) };
  });

  return { faceStyle, borderStyle, reduceMotion };
}
