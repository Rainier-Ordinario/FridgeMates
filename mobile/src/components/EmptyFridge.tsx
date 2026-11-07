import { colors, moods, space } from '@/theme';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { SpeechBubble } from './SpeechBubble';

/** Playful empty state that points at the Scan button. */
export function EmptyFridge() {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(t.value, [0, 1], [0, 8]) }] }));

  return (
    <View style={styles.wrap} accessibilityLabel="Your fridge is empty. Scan something to give it a face.">
      <View style={[styles.tile, { backgroundColor: moods.chill.tint, borderColor: moods.chill.color }]}>
        <AppText style={styles.emoji}>🧊</AppText>
      </View>
      <SpeechBubble text="It's quiet in here. Too quiet." tail="top" style={styles.bubble} />
      <AppText variant="body" color={colors.inkMuted} align="center">
        Tap Scan food to add your first character.
      </AppText>
      <Animated.View style={bob}>
        <AppText style={styles.pointer}>👇</AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingTop: space.xl, paddingHorizontal: space.xl },
  tile: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 48, lineHeight: 58 },
  bubble: { alignSelf: 'center', maxWidth: 240 },
  pointer: { fontSize: 36, lineHeight: 44, marginTop: space.sm },
});
