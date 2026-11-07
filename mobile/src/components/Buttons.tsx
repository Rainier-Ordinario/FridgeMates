import { colors, hit, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from './AppText';

interface PrimaryProps {
  label: string;
  emoji?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  tone?: 'brand' | 'danger' | 'success';
  /** 64pt tall with a 20pt label: the one primary action on a screen. */
  big?: boolean;
}

const tones = { brand: colors.brand, danger: colors.dangerStrong, success: colors.success } as const;

/** Big thumb-reachable pill. Used for Scan, "Ate it", "I cooked it". */
export function PrimaryButton({
  label,
  emoji,
  icon,
  onPress,
  style,
  tone = 'brand',
  big = false,
}: PrimaryProps) {
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
        big && styles.primaryBig,
        { backgroundColor: tones[tone] },
        tone === 'brand' && shadow.button,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ?? (emoji ? <AppText style={styles.primaryEmoji}>{emoji}</AppText> : null)}
      <AppText
        variant="heading"
        color={tone === 'danger' ? colors.surface : colors.brandInk}
        style={big && styles.primaryBigLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

interface SecondaryProps {
  label: string;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  /** Outlined (2pt ink border) variant for scan results. */
  outlined?: boolean;
  emoji?: string;
  onPress: () => void;
  style?: ViewStyle;
}

/** Labeled tonal button, 48pt: the quiet sibling of PrimaryButton. */
export function SecondaryButton({
  label,
  icon,
  emoji,
  onPress,
  style,
  accessibilityLabel,
  outlined = false,
}: SecondaryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.secondary,
        outlined && styles.secondaryOutlined,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ?? (emoji ? <AppText style={styles.secondaryEmoji}>{emoji}</AppText> : null)}
      <AppText variant="bodyBold" color={colors.ink} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface RoundProps {
  /** Emoji glyph, or pass `icon` for an SVG. */
  emoji?: string;
  icon?: React.ReactNode;
  label: string;
  onPress?: () => void;
  size?: number;
  /** Over the camera: white 14% fill, white 25% border, white glyph. */
  dark?: boolean;
}

/** Small round tonal button (Chat, Match, back, etc.). */
export function RoundButton({ emoji, icon, label, onPress, size = hit.primary, dark = false }: RoundProps) {
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
        dark && styles.roundDark,
        pressed && styles.pressed,
      ]}
    >
      {icon ?? (
        <AppText
          style={{ fontSize: size * 0.42, lineHeight: size * 0.52 }}
          color={dark ? colors.surface : colors.ink}
        >
          {emoji}
        </AppText>
      )}
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  emoji?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  tone?: 'neutral' | 'debug';
}

/** Small secondary action, e.g. the "Skip ahead a day" demo control. */
export function Chip({ label, emoji, icon, onPress, tone = 'neutral' }: ChipProps) {
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
        {icon ?? (emoji ? <AppText variant="caption">{emoji}</AppText> : null)}
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
  primaryBig: { minHeight: 64, borderRadius: 32 },
  primaryBigLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, lineHeight: 26 },
  primaryEmoji: { fontSize: 22, lineHeight: 26 },
  secondary: {
    minHeight: hit.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  secondaryOutlined: { minHeight: 44, borderWidth: 2, borderColor: colors.ink },
  secondaryEmoji: { fontSize: 18, lineHeight: 22 },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...shadow.card,
  },
  roundDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.25)',
    shadowOpacity: 0,
    elevation: 0,
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
