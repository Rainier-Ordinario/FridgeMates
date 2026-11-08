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
}

const tones = { brand: colors.brand, danger: colors.dangerStrong, success: colors.success } as const;

/** Thumb-reachable 52pt pill with an 18pt label. Used for Scan, "Ate it", "I cooked it". */
export function PrimaryButton({ label, emoji, icon, onPress, style, tone = 'brand' }: PrimaryProps) {
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
      {icon ?? (emoji ? <AppText style={styles.primaryEmoji}>{emoji}</AppText> : null)}
      <AppText style={styles.primaryLabel} color={tone === 'danger' ? colors.surface : colors.brandInk}>
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
  /** 52pt, for a secondary that sits next to a primary in a footer row. */
  tall?: boolean;
  /** 15/20 label (dense rows of two). */
  small?: boolean;
  emoji?: string;
  onPress: () => void;
  style?: ViewStyle;
}

/** Labeled tonal button, 44pt: the quiet sibling of PrimaryButton. */
export function SecondaryButton({
  label,
  icon,
  emoji,
  onPress,
  style,
  accessibilityLabel,
  outlined = false,
  tall = false,
  small = false,
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
        tall && styles.secondaryTall,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ?? (emoji ? <AppText style={styles.secondaryEmoji}>{emoji}</AppText> : null)}
      <AppText variant="bodyBold" color={colors.ink} numberOfLines={1} style={small && styles.secondarySmall}>
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
export function RoundButton({ emoji, icon, label, onPress, size = hit.min, dark = false }: RoundProps) {
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
  primaryLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, lineHeight: 24 },
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
  secondaryOutlined: { borderWidth: 2, borderColor: colors.ink },
  secondaryTall: { minHeight: 52 },
  secondarySmall: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20 },
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
