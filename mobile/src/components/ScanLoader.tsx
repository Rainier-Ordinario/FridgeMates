import { colors, moods, radius, space } from '@/theme';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Mascot } from './Mascot';
import { MoodLoader } from './MoodLoader';
import { TypingDots } from './TypingDots';

/**
 * Scan loading: the fridge manager thinks in the middle while the designer's five doodles
 * pop in around it on their mood-color circles. Falls back to MoodLoader if the art fails to load.
 */
const doodles = [
  {
    source: require('@/assets/loader/loader-1.png'),
    color: moods.cocky.color,
    tint: moods.cocky.tint,
    name: 'avocado',
  },
  {
    source: require('@/assets/loader/loader-2.png'),
    color: moods.chill.color,
    tint: moods.chill.tint,
    name: 'tomato',
  },
  {
    source: require('@/assets/loader/loader-3.png'),
    color: moods.nervous.color,
    tint: moods.nervous.tint,
    name: 'yogurt',
  },
  {
    source: require('@/assets/loader/loader-4.png'),
    color: moods.dramatic.color,
    tint: moods.dramatic.tint,
    name: 'carrot',
  },
  {
    source: require('@/assets/loader/loader-5.png'),
    color: colors.brand,
    tint: colors.surfaceAlt,
    name: 'milk',
  },
];

const phrases = [
  'Waking up your food…',
  'Assigning personalities…',
  'Reading the tiny printed dates…',
  'Asking the fridge for gossip…',
];
const STAGGER_MS = 350;

export function ScanLoader() {
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1400);
    return () => clearInterval(id);
  }, []);

  if (failed) return <MoodLoader phrases={phrases} />;

  // Arc geometry: fits a 375pt phone with 24pt gutters (circle 76, radius ~123 → 322pt wide).
  const stageW = Math.min(width - 2 * space.xl, 340);
  const circle = stageW < 320 ? 70 : 76;
  const r = Math.round(stageW / 2 - circle / 2 - 2);
  const cx = stageW / 2;
  const cy = r + circle / 2 + 8; // mascot center sits below the arc
  // 40° apart: neighbouring circles never touch (chord ≥ circle) at this radius.
  const angles = [190, 230, 270, 310, 350];
  const stageH = cy + 70;

  return (
    <View style={styles.wrap}>
      <View style={{ width: stageW, height: stageH }}>
        {doodles.map((d, i) => {
          const a = (angles[i] * Math.PI) / 180;
          const left = cx + r * Math.cos(a) - circle / 2;
          const top = cy + r * Math.sin(a) - circle / 2;
          return (
            <Animated.View
              key={d.name}
              entering={
                reduceMotion
                  ? undefined
                  : ZoomIn.springify()
                      .damping(10)
                      .delay(300 + i * STAGGER_MS)
              }
              style={[
                styles.doodle,
                {
                  left,
                  top,
                  width: circle,
                  height: circle,
                  borderRadius: circle / 2,
                  backgroundColor: d.tint,
                  borderColor: d.color,
                },
              ]}
              accessibilityElementsHidden
            >
              <Image
                source={d.source}
                style={{ width: circle * 0.78, height: circle * 0.78 }}
                contentFit="contain"
                onError={() => setFailed(true)}
              />
            </Animated.View>
          );
        })}
        <View style={[styles.mascot, { left: cx - 60, top: cy - 60 }]}>
          <Mascot
            size={120}
            state="thinking"
            hideBubble
            accessibilityLabel="The fridge manager is thinking"
          />
        </View>
      </View>
      <TypingDots tint={colors.surface} dotColor={colors.inkMuted} />
      <AppText variant="title" align="center" accessibilityLiveRegion="polite">
        {phrases[tick % phrases.length]}
      </AppText>
      <AppText variant="caption" color={colors.inkMuted} align="center">
        this takes a few seconds
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md },
  doodle: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  mascot: { position: 'absolute' },
});
