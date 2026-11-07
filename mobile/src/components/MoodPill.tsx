import { plainTimeLabel } from '@/logic/mood';
import { moods, radius, space, type Mood } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

interface Props {
  mood: Mood;
  daysLeft: number;
  compact?: boolean;
}

/** "2 days left" countdown pill in the mood's color. */
export function MoodPill({ mood, daysLeft, compact }: Props) {
  const m = moods[mood];
  return (
    <View style={[styles.pill, { backgroundColor: m.tint, borderColor: m.color }, compact && styles.compact]}>
      <AppText variant="caption" color={m.text}>
        {plainTimeLabel(daysLeft)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 1,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  compact: { paddingHorizontal: space.sm, paddingVertical: 2 },
});
