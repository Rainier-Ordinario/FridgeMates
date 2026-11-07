import { colors, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Confetti } from './Confetti';
import { TypingDots } from './TypingDots';

/** The Fall Hacks organizers' mascot, used with permission. */
export type MascotExpression = 'happy' | 'sad' | 'thinking' | 'excited' | 'shocked' | 'proud' | 'sleepy';
export type MascotState =
  'idle' | 'tapped' | 'thinking' | 'answering' | 'goodNews' | 'badNews' | 'celebrate' | 'empty';

const images: Record<MascotExpression, number> = {
  happy: require('@/assets/mascot/happy.png'),
  sad: require('@/assets/mascot/sad.png'),
  thinking: require('@/assets/mascot/thinking.png'),
  excited: require('@/assets/mascot/excited.png'),
  shocked: require('@/assets/mascot/shocked.png'),
  proud: require('@/assets/mascot/proud.png'),
  sleepy: require('@/assets/mascot/sleepy.png'),
};

/** Expression a state implies when none is given. Missing art falls back to happy or sad. */
const defaultExpression: Record<MascotState, MascotExpression> = {
  idle: 'happy',
  tapped: 'happy',
  thinking: 'thinking',
  answering: 'happy',
  goodNews: 'excited',
  badNews: 'sad',
  celebrate: 'proud',
  empty: 'sleepy',
};

const friendlyLines = [
  'Hi! I keep an eye on everyone in here.',
  "Ask me who's about to turn.",
  'The avocado is being dramatic again.',
  'Fridge looks good. Mostly.',
  'I counted everyone twice. Twice!',
  'Pssst. The yogurt talks about you.',
];

interface Props {
  state?: MascotState;
  expression?: MascotExpression;
  size?: number;
  /** Bubble text (e.g. an answer line). Tapped lines and thinking dots are handled internally. */
  line?: string | null;
  /** Bump this to make the mascot hop (answering state). */
  hopKey?: number;
  /** Tappable: squash + haptic + a random friendly line, then onTap. */
  interactive?: boolean;
  onTap?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  /** Hide the bubble entirely (e.g. the small Fridge button). */
  hideBubble?: boolean;
}

export function Mascot({
  state = 'idle',
  expression,
  size = 120,
  line = null,
  hopKey = 0,
  interactive = false,
  onTap,
  accessibilityLabel = 'The fridge manager',
  style,
  hideBubble = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const shown = expression ?? defaultExpression[state];
  const [tapLine, setTapLine] = useState<string | null>(null);

  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  const reset = useCallback(() => {
    [y, x, rot, sx, sy].forEach(cancelAnimation);
    y.set(withTiming(0, { duration: 180 }));
    x.set(withTiming(0, { duration: 180 }));
    rot.set(withTiming(0, { duration: 180 }));
    sx.set(withTiming(1, { duration: 180 }));
    sy.set(withTiming(1, { duration: 180 }));
  }, [y, x, rot, sx, sy]);

  // State loops. Reduce Motion: static pose, no loops.
  useEffect(() => {
    reset();
    if (reduceMotion) return;
    const sine = Easing.inOut(Easing.sin);
    switch (state) {
      case 'idle':
      case 'empty':
      case 'answering':
        y.set(
          withDelay(
            200,
            withRepeat(
              withSequence(
                withTiming(-4, { duration: 1200, easing: sine }),
                withTiming(4, { duration: 1200, easing: sine }),
              ),
              -1,
              true,
            ),
          ),
        );
        break;
      case 'thinking':
        rot.set(
          withRepeat(
            withSequence(
              withTiming(-6, { duration: 900, easing: sine }),
              withTiming(6, { duration: 900, easing: sine }),
            ),
            -1,
            true,
          ),
        );
        break;
      case 'goodNews':
        y.set(
          withSequence(
            withTiming(-18, { duration: 220, easing: Easing.out(Easing.quad) }),
            withSpring(0, { damping: 9 }),
          ),
        );
        rot.set(
          withDelay(
            60,
            withSequence(
              withTiming(360, { duration: 520, easing: Easing.inOut(Easing.cubic) }),
              withTiming(0, { duration: 0 }),
            ),
          ),
        );
        break;
      case 'badNews':
        y.set(withTiming(4, { duration: 400 }));
        rot.set(
          withRepeat(
            withSequence(
              withTiming(-3, { duration: 1400, easing: sine }),
              withTiming(3, { duration: 1400, easing: sine }),
            ),
            -1,
            true,
          ),
        );
        break;
      case 'celebrate':
        x.set(-size);
        x.set(withSpring(0, { damping: 14 }));
        y.set(
          withDelay(
            450,
            withSequence(
              withTiming(-16, { duration: 200, easing: Easing.out(Easing.quad) }),
              withSpring(0, { damping: 10 }),
              withTiming(-16, { duration: 200, easing: Easing.out(Easing.quad) }),
              withSpring(0, { damping: 10 }),
            ),
          ),
        );
        break;
      case 'tapped':
        break;
    }
    return () => [y, x, rot, sx, sy].forEach(cancelAnimation);
  }, [state, reduceMotion, reset, size, x, y, rot, sx, sy]);

  // Hop when a new answer line appears.
  useEffect(() => {
    if (!hopKey || reduceMotion) return;
    y.set(
      withSequence(
        withTiming(-8, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 11 }),
      ),
    );
  }, [hopKey, reduceMotion, y]);

  function squash() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!reduceMotion) {
      sy.set(
        withSequence(
          withTiming(0.9, { duration: 90 }),
          withTiming(1.05, { duration: 120 }),
          withSpring(1, { damping: 12 }),
        ),
      );
      sx.set(
        withSequence(
          withTiming(1.08, { duration: 90 }),
          withTiming(0.97, { duration: 120 }),
          withSpring(1, { damping: 12 }),
        ),
      );
    }
    setTapLine(friendlyLines[Math.floor(Math.random() * friendlyLines.length)]);
    setTimeout(() => setTapLine(null), 2600);
    onTap?.();
  }

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rot.value}deg` },
      { scaleX: sx.value },
      { scaleY: sy.value },
    ],
  }));

  const bubbleText = state === 'thinking' ? null : (tapLine ?? line);
  const showDots = state === 'thinking' && !hideBubble;
  const showBubble = !hideBubble && !!bubbleText;

  const figure = (
    <Animated.View style={[{ width: size, height: size }, body]}>
      <Animated.View
        key={shown}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        <Image
          source={images[shown]}
          style={{ width: size, height: size }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      {state === 'goodNews' && !reduceMotion && <Sparkles size={size} />}
      {state === 'badNews' && <SweatDrop size={size} reduceMotion={reduceMotion} />}
    </Animated.View>
  );

  return (
    <View
      style={[styles.wrap, style]}
      accessible
      accessibilityRole={interactive ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel}
    >
      {(showBubble || showDots) && (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[styles.bubble, { maxWidth: Math.max(220, size * 2) }]}
        >
          {showDots ? (
            <TypingDots tint={colors.surface} dotColor={colors.inkMuted} />
          ) : (
            <AppText variant="body">{bubbleText}</AppText>
          )}
          <View style={styles.tail} />
        </Animated.View>
      )}
      {interactive ? (
        <Pressable onPress={squash} hitSlop={8}>
          {figure}
        </Pressable>
      ) : (
        figure
      )}
      {state === 'celebrate' && !reduceMotion && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}>
          <Confetti count={18} />
        </View>
      )}
    </View>
  );
}

/** Five small sparkles around the figure, never over the face. */
function Sparkles({ size }: { size: number }) {
  const spots = [
    { top: -6, left: size * 0.05 },
    { top: size * 0.08, right: -8 },
    { bottom: size * 0.15, left: -10 },
    { top: -10, right: size * 0.25 },
    { bottom: -4, right: size * 0.05 },
  ];
  return (
    <>
      {spots.map((pos, i) => (
        <Animated.View
          key={i}
          entering={ZoomIn.delay(i * 70)
            .springify()
            .damping(10)}
          exiting={ZoomOut.duration(150)}
          style={[styles.sparkle, pos]}
          pointerEvents="none"
        >
          <AppText style={styles.sparkleText} color={i % 2 ? colors.brand : moods.nervous.color}>
            ✦
          </AppText>
        </Animated.View>
      ))}
    </>
  );
}

/** A single sweat drop at the temple that bobs slowly. */
function SweatDrop({ size, reduceMotion }: { size: number; reduceMotion: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);
  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: t.value * 3 }],
    opacity: 0.85 + t.value * 0.15,
  }));
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.drop,
        { top: size * 0.08, right: size * 0.06, width: size * 0.11, height: size * 0.15 },
        a,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    ...shadow.card,
  },
  tail: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -7,
    width: 14,
    height: 14,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 3,
  },
  sparkle: { position: 'absolute' },
  sparkleText: { fontSize: 16, lineHeight: 20 },
  drop: {
    position: 'absolute',
    backgroundColor: moods.chill.color,
    borderRadius: 999,
    borderTopLeftRadius: 2,
  },
});
