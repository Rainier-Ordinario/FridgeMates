import type { Scoreboard as ScoreboardData } from '@/logic/store';
import { colors, radius, shadow, space } from '@/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

interface Props {
  data: ScoreboardData;
  onPressLost?: () => void;
}

/** In fridge / rescued / lost. "Lost" opens the memorial. */
export function Scoreboard({ data, onPressLost }: Props) {
  return (
    <View style={styles.row}>
      <Tile emoji="🧊" label="in fridge" value={data.inFridge} color={colors.ink} />
      <Tile emoji="🎉" label="rescued" value={data.rescued} color={colors.success} />
      <Tile emoji="🪦" label="lost" value={data.lost} color={colors.danger} onPress={onPressLost} />
    </View>
  );
}

function Tile({
  emoji,
  label,
  value,
  color,
  onPress,
}: {
  emoji: string;
  label: string;
  value: number;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <AppText style={styles.emoji}>{emoji}</AppText>
      <AppText variant="title" color={color} style={styles.value}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.inkMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    gap: 2,
    ...shadow.card,
  },
  pressed: { opacity: 0.8 },
  emoji: { fontSize: 20, lineHeight: 24 },
  value: { fontVariant: ['tabular-nums'] },
});
