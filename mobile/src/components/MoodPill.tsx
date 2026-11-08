import { plainTimeLabel } from '@/logic/mood';
import { colors, moods, radius, space, type Mood } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

interface Props {
  mood: Mood;
  /** 'mood' shows the mood name (Cocky, Chill…); 'time' shows the plain-language time. */
  variant?: 'mood' | 'time';
  daysLeft?: number;
  compact?: boolean;
}

/** White pill with the mood ring: the mood name, or the plain-language time. */
export function MoodPill({ mood, variant = 'mood', daysLeft = 0, compact }: Props) {
  const m = moods[mood];
  return (
    <View style={[styles.pill, { borderColor: m.color }, compact && styles.compact]}>
      <AppText style={styles.text} color={m.text}>
        {variant === 'mood' ? m.label : plainTimeLabel(daysLeft)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  compact: { paddingHorizontal: space.sm, paddingVertical: 2 },
  text: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18 },
});
