import { colors, hit, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from './AppText';

interface PrimaryProps {
  label: string;
  emoji?: string;
  onPress: () => void;
  style?: ViewStyle;
  tone?: 'brand' | 'danger' | 'success';
}

const tones = { brand: colors.brand, danger: colors.dangerStrong, success: colors.success } as const;

function textColorForTone(tone: PrimaryProps['tone']): string {
  if (tone === 'danger') {
    return colors.surface;
  }
  return colors.brandInk;
}

/** Big thumb-reachable pill. Used for Scan, "Ate it", "I cooked it". */
export function PrimaryButton({ label, emoji, onPress, style, tone = 'brand' }: PrimaryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: tones[tone] },
        tone === 'brand' && shadow.button,
        pressed && styles.pressed,
        style,
      ]}
    >
      {emoji ? <AppText style={styles.primaryEmoji}>{emoji}</AppText> : null}
      <AppText variant="heading" color={textColorForTone(tone)}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface RoundProps {
  emoji: string;
  label: string;
  onPress?: () => void;
  size?: number;
}

/** Small round tonal button (Chat, Match, back, etc.). */
export function RoundButton({ emoji, label, onPress, size = hit.primary }: RoundProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <AppText style={{ fontSize: size * 0.42, lineHeight: size * 0.52 }}>{emoji}</AppText>
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  emoji?: string;
  onPress: () => void;
  tone?: 'neutral' | 'debug';
}

/** Small secondary action, e.g. the "Skip ahead a day" demo control. */
export function Chip({ label, emoji, onPress, tone = 'neutral' }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, tone === 'debug' && styles.chipDebug, pressed && styles.pressed]}
    >
      <View style={styles.chipInner}>
        {emoji ? <AppText variant="caption">{emoji}</AppText> : null}
        <AppText variant="caption" color={colors.ink}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: hit.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
  },
  primaryEmoji: { fontSize: 22, lineHeight: 26 },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...shadow.card,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipDebug: { backgroundColor: colors.surfaceAlt, borderColor: '#FFD3B3', borderStyle: 'dashed' },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
