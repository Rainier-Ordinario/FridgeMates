import { colors, moods, type Mood } from '@/theme';
import { faceOverlays } from '@/theme/faceOverlays';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { FoodIcon, UiIcon, type FluentIconName } from './FoodIcon';
import { useMoodMotion } from './useMoodMotion';

interface Props {
  /** Food name: picks a Fluent Emoji icon. An empty name gets the generic plate. */
  food?: string;
  /** Ignored. Kept so older call sites compile; the backend's emoji is never drawn (system emoji look out of place). */
  emoji?: string;
  mood: Mood;
  size?: number;
  /** Animate per mood (default true). Pass false in long lists you want cheap. */
  animated?: boolean;
  showBadge?: boolean;
  /** Draw the mood expression over the icon (icon dimmed to 40%). Off automatically under 36px. */
  expression?: boolean;
  /** Accessibility label, e.g. "Avo, dramatic". Omit when a parent control already describes it. */
  label?: string;
  /** Circle fill; defaults to the mood tint. Use white on tinted cards. */
  fill?: string;
  /** Local crop of the scanned photo; shown instead of the icon, inside the mood ring. */
  photo?: string;
}

/** Mood badge icons (Fluent Emoji) instead of system emoji. */
const badgeIcon: Record<Mood, FluentIconName> = {
  cocky: 'smiling-face-with-sunglasses',
  chill: 'relieved-face',
  nervous: 'grimacing-face',
  dramatic: 'face-screaming-in-fear',
  ghost: 'ghost',
};

/** The character's face: a Fluent food icon in a mood-tinted circle with a mood badge. */
export function Face({
  food,
  mood,
  size = 64,
  animated = true,
  showBadge = true,
  expression = true,
  label,
  fill,
  photo,
}: Props) {
  const overlay = expression && size >= 36 && !photo;
  const m = moods[mood];
  const { faceStyle } = useMoodMotion(mood);
  const badgeSize = Math.max(20, Math.round(size * 0.34));
  const iconSize = Math.round(size * 0.6);

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
            backgroundColor: fill ?? m.tint,
            borderColor: m.color,
          },
        ]}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: size, height: size }} contentFit="cover" />
        ) : (
          <View style={{ opacity: getIconOpacity(overlay) }}>
            <FoodIcon name={food ?? ''} size={iconSize} />
          </View>
        )}
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
          <UiIcon icon={badgeIcon[mood]} size={Math.round(badgeSize * 0.7)} />
        </View>
      )}
    </Animated.View>
  );
}

function getIconOpacity(overlay: boolean): number {
  if (overlay) {
    return 0.4;
  }
  return 1;
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
