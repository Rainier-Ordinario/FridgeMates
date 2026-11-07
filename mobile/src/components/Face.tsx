import { colors, moods, type Mood } from '@/theme';
import { faceOverlays } from '@/theme/faceOverlays';
import { SvgXml } from 'react-native-svg';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppText } from './AppText';
import { useMoodMotion } from './useMoodMotion';

interface Props {
  emoji: string;
  mood: Mood;
  size?: number;
  /** Animate per mood (default true). Pass false in long lists you want cheap. */
  animated?: boolean;
  showBadge?: boolean;
  /** Draw the mood expression over the emoji (emoji dimmed to 40%). Off automatically under 36px. */
  expression?: boolean;
  /** Accessibility label, e.g. "Avo, dramatic". Omit when a parent control already describes it. */
  label?: string;
}

/** The character's face: food emoji in a mood-tinted circle with a mood badge. */
export function Face({
  emoji,
  mood,
  size = 64,
  animated = true,
  showBadge = true,
  expression = true,
  label,
}: Props) {
  const overlay = expression && size >= 36;
  const m = moods[mood];
  const { faceStyle } = useMoodMotion(mood);
  const badgeSize = Math.max(20, Math.round(size * 0.34));

  return (
    <Animated.View
      style={[{ width: size, height: size }, animated && faceStyle]}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: m.tint,
            borderColor: m.color,
          },
        ]}
      >
        <AppText style={{ fontSize: size * 0.52, lineHeight: size * 0.62, opacity: overlay ? 0.4 : 1 }}>
          {emoji}
        </AppText>
        {overlay && (
          <View pointerEvents="none" style={styles.overlay}>
            <SvgXml xml={faceOverlays[mood]} width={size} height={size} />
          </View>
        )}
      </View>
      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              right: -badgeSize * 0.1,
              bottom: -badgeSize * 0.1,
            },
          ]}
        >
          <AppText style={{ fontSize: badgeSize * 0.6, lineHeight: badgeSize * 0.75 }}>{m.badge}</AppText>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  overlay: { position: 'absolute', top: -2, left: -2 },
  badge: {
    position: 'absolute',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
