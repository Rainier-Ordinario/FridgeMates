import type { Scoreboard as ScoreboardData } from '@/logic/store';
import { colors, radius, shadow, space } from '@/theme';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

interface Props {
  data: ScoreboardData;
  onPressLost?: () => void;
  /** Rings the rescued tile and shows "+N" on it (after "I cooked it"). */
  rescuedBump?: number;
  /** Animate the rescued value counting up from (value - bump). */
  countUp?: boolean;
}

/** In fridge / rescued / lost. "Lost" opens the memorial. */
export function Scoreboard({ data, onPressLost, rescuedBump = 0, countUp = false }: Props) {
  const rescued = useCountUp(data.rescued, countUp ? data.rescued - rescuedBump : data.rescued);
  return (
    <View style={styles.row}>
      <Tile emoji="🧊" label="in fridge" value={data.inFridge} color={colors.ink} />
      <Tile
        emoji="🎉"
        label="rescued"
        value={rescued}
        color={colors.success}
        highlight={rescuedBump > 0}
        bump={rescuedBump}
      />
      <Tile emoji="🪦" label="lost" value={data.lost} color={colors.danger} onPress={onPressLost} />
    </View>
  );
}

/** One quiet line under the Fridge title: "5 in fridge · 2 rescued · 1 lost". */
export function StatsLine({
  data,
  rescuedBump = 0,
  onPressLost,
}: {
  data: ScoreboardData;
  rescuedBump?: number;
  onPressLost?: () => void;
}) {
  return (
    <View
      style={styles.line}
      accessible
      accessibilityLabel={`${data.inFridge} in fridge, ${data.rescued} rescued, ${data.lost} lost`}
    >
      <AppText variant="caption" color={colors.inkMuted}>
        {data.inFridge} in fridge
      </AppText>
      <AppText variant="caption" color={colors.inkFaint}>
        ·
      </AppText>
      <AppText variant="caption" color={rescuedBump > 0 ? colors.success : colors.inkMuted}>
        {data.rescued} rescued{rescuedBump > 0 ? ` (+${rescuedBump})` : ''}
      </AppText>
      <AppText variant="caption" color={colors.inkFaint}>
        ·
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${data.lost} lost, open the memorial`}
        onPress={onPressLost}
        hitSlop={8}
      >
        <AppText variant="caption" color={data.lost > 0 ? colors.danger : colors.inkMuted}>
          {data.lost} lost{data.lost > 0 ? ' ›' : ''}
        </AppText>
      </Pressable>
    </View>
  );
}

/** Counts from `from` to `to` over ~600ms whenever `to` changes. */
function useCountUp(to: number, from: number): number {
  const [value, setValue] = useState(to);
  const fromRef = useRef(from);
  useEffect(() => {
    const start = fromRef.current;
    if (start === to) {
      setValue(to);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 600);
      setValue(Math.round(start + (to - start) * p));
      if (p >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [to]);
  return value;
}

function Tile({
  emoji,
  label,
  value,
  color,
  onPress,
  highlight = false,
  bump = 0,
}: {
  emoji: string;
  label: string;
  value: number;
  color: string;
  onPress?: () => void;
  highlight?: boolean;
  bump?: number;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.tile, highlight && styles.tileHighlight, pressed && styles.pressed]}
    >
      {bump > 0 && (
        <View style={styles.bump}>
          <AppText variant="caption" color={colors.ink}>
            +{bump}
          </AppText>
        </View>
      )}
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
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    gap: 2,
    ...shadow.card,
  },
  tileHighlight: { borderWidth: 3, borderColor: colors.success },
  bump: {
    position: 'absolute',
    top: -10,
    right: -6,
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 1,
  },
  pressed: { opacity: 0.8 },
  emoji: { fontSize: 20, lineHeight: 24 },
  value: { fontVariant: ['tabular-nums'] },
});
