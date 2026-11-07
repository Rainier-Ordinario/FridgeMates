import { colors, radius, space } from '@/theme';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from './AppText';

interface Props {
  text: string;
  /** Which side the tail points to. */
  tail?: 'left' | 'top' | 'none';
  tint?: string;
  style?: ViewStyle;
  /** Scan-results size: padding 10×14, 15/20 text. */
  compact?: boolean;
}

/** Chat-style bubble used for intros, chat lines, and the detail screen. */
export function SpeechBubble({ text, tail = 'left', tint = colors.surface, style, compact = false }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {tail === 'top' && <View style={[styles.tailTop, { borderBottomColor: tint }]} />}
      <View style={[styles.bubble, { backgroundColor: tint }, compact && styles.compact]}>
        {tail === 'left' && <View style={[styles.tailLeft, { borderRightColor: tint }]} />}
        <AppText variant="body" style={compact && styles.compactText}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    alignSelf: 'stretch',
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  compact: { paddingVertical: 10, paddingHorizontal: 14 },
  compactText: { fontSize: 15, lineHeight: 20 },
  tailTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  tailLeft: {
    position: 'absolute',
    left: -10,
    top: 14,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
