import { AppText } from '@/components/AppText';
import { UiIcon, type FluentIconName } from '@/components/FoodIcon';
import { PrimaryButton } from '@/components/Buttons';
import { DockedFooter } from '@/components/DockedFooter';
import { Screen } from '@/components/Screen';
import { useFirstRun } from '@/logic/firstRun';
import { useFridge } from '@/logic/store';
import { colors, radius, shadow, space, motion } from '@/theme';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const beats: { icon: FluentIconName; text: string }[] = [
  { icon: 'camera', text: 'Scan your groceries.' },
  { icon: 'face-screaming-in-fear', text: 'Each one gets a face and a mood that changes as it ages.' },
  { icon: 'cooking', text: 'Ask the fridge manager what to eat first.' },
];

/** First run: the smiling fridge, the tagline, three beats, Get started. */
export default function WelcomeScreen() {
  const { markWelcomed } = useFirstRun();
  const { loadDemo } = useFridge();
  // ?replay=1: opened from Settings → just go back, don't touch the first-run flag.
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);
  const breathe = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.04]) }],
  }));

  function start(withDemo: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (replay) {
      router.back();
      return;
    }
    if (withDemo) loadDemo();
    markWelcomed();
    router.replace('/');
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.hero}>
          <Animated.View
            style={[styles.tile, breathe]}
            accessibilityRole="image"
            accessibilityLabel="FridgeMates, a smiling fridge"
          >
            <Image source={require('@/assets/icon.png')} style={styles.icon} contentFit="cover" />
          </Animated.View>
          <AppText variant="display" align="center">
            FridgeMates
          </AppText>
          <AppText variant="heading" color={colors.inkMuted} align="center" style={styles.tagline}>
            Spoil alert: your food has feelings.
          </AppText>
        </Animated.View>

        <View style={styles.beats}>
          {beats.map((b, i) => (
            <Animated.View
              key={b.icon}
              entering={FadeInDown.delay(250 + i * 120).duration(motion.base)}
              style={styles.beat}
            >
              <View style={styles.beatEmoji}>
                <UiIcon icon={b.icon} size={24} />
              </View>
              <AppText variant="body" style={{ flex: 1 }}>
                {b.text}
              </AppText>
            </Animated.View>
          ))}
        </View>
      </View>

      <DockedFooter>
        <PrimaryButton
          icon={<UiIcon icon="ice" size={22} />}
          label={replay ? 'Back to the fridge' : 'Get started'}
          onPress={() => start(false)}
        />
        {!replay && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load the demo fridge"
            onPress={() => start(true)}
            style={({ pressed }) => [styles.demoLink, pressed && { opacity: 0.7 }]}
          >
            <AppText variant="caption" color={colors.inkMuted} align="center">
              Just here for the demo? Load the demo fridge →
            </AppText>
          </Pressable>
        )}
      </DockedFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'center', gap: space.xxl },
  hero: { alignItems: 'center', gap: space.sm },
  tile: {
    width: 160,
    height: 160,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: space.md,
    ...shadow.card,
  },
  icon: { width: 160, height: 160 },
  tagline: { fontFamily: 'Nunito_600SemiBold' },
  beats: { gap: space.md },
  beat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    ...shadow.card,
  },
  beatEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatEmojiText: { fontSize: 20, lineHeight: 26 },
  demoLink: { minHeight: 44, justifyContent: 'center' },
});
