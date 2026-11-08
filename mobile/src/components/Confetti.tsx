import { colors, moods } from '@/theme';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/** Deterministic pseudo-random in [0,1) so render stays pure (react-hooks/purity). */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const palette = [
  colors.brand,
  moods.cocky.color,
  moods.chill.color,
  moods.nervous.color,
  moods.dramatic.color,
];

interface PieceSpec {
  x: number;
  w: number;
  h: number;
  round: boolean;
  color: string;
  delay: number;
  duration: number;
  sway: number;
  spin: number;
}

/** 46 pieces of confetti falling once over the screen. Skipped entirely under Reduce Motion. */
export function Confetti({ count = 46 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const pieces = useMemo<PieceSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: rand(i, 1) * width,
        w: 6 + rand(i, 2) * 4,
        h: 10 + rand(i, 3) * 6,
        round: i % 3 === 0,
        color: palette[i % palette.length],
        delay: rand(i, 4) * 700,
        duration: 1800 + rand(i, 5) * 900,
        sway: (rand(i, 6) - 0.5) * 120,
        spin: (rand(i, 7) - 0.5) * 720,
      })),
    [count, width],
  );
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((p, i) => (
        <Piece key={i} spec={p} height={height} />
      ))}
    </View>
  );
}

function Piece({ spec, height }: { spec: PieceSpec; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      spec.delay,
      withTiming(1, { duration: spec.duration, easing: Easing.in(Easing.quad) }),
    );
  }, [t, spec.delay, spec.duration]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [-40, height + 40]) },
      { translateX: Math.sin(t.value * Math.PI * 2) * spec.sway },
      { rotate: `${t.value * spec.spin}deg` },
    ],
    opacity: interpolate(t.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  }));
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: spec.x,
          width: spec.w,
          height: getPieceHeight(spec),
          borderRadius: getPieceRadius(spec),
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

function getPieceHeight(spec: PieceSpec): number {
  if (spec.round) {
    return spec.w;
  }
  return spec.h;
}

function getPieceRadius(spec: PieceSpec): number {
  if (spec.round) {
    return spec.w / 2;
  }
  return 2;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  piece: { position: 'absolute', top: 0 },
});
