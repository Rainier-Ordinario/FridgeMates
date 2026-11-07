import { colors, moods, type Mood } from '@/theme';
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
}

/** The character's face: food emoji in a mood-tinted circle with a mood badge. */
export function Face({ emoji, mood, size = 64, animated = true, showBadge = true }: Props) {
  const m = moods[mood];
  const { faceStyle } = useMoodMotion(mood);
  const badgeSize = Math.max(20, Math.round(size * 0.34));

  return (
    <Animated.View style={[{ width: size, height: size }, animated && faceStyle]}>
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
        <AppText style={{ fontSize: size * 0.52, lineHeight: size * 0.62 }}>{emoji}</AppText>
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
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
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
