import { AppText } from '@/components/AppText';
import { DockedFooter } from '@/components/DockedFooter';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Tombstone } from '@/components/Tombstone';
import { formatShort } from '@/logic/dates';
import { useFridge } from '@/logic/store';
import { colors, space, motion } from '@/theme';
import { USE_MOCK } from '@/api/config';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const FALLBACK_EPITAPH = 'Gone too soon. Bought with good intentions.';

interface Stone {
  id: string;
  emoji: string;
  name: string;
  dates: string;
  epitaph: string;
}

/** Demo wall (mock mode + ?demo=1) so the pitch can show a full memorial. */
const demoStones: Stone[] = [
  {
    id: 'd1',
    emoji: '🥬',
    name: 'Leafy Lou',
    dates: 'Nov 1 – Nov 4',
    epitaph: 'Here lies Spinach. Bought with good intentions. Never opened.',
  },
  {
    id: 'd2',
    emoji: '🧅',
    name: 'Half an Onion',
    dates: 'Oct 20 – Oct 29',
    epitaph: 'Wrapped in foil. Forgotten in spirit.',
  },
  {
    id: 'd3',
    emoji: '🌿',
    name: 'Cilantro Carl',
    dates: 'Oct 12 – Oct 15',
    epitaph: "It wasn't you. It was the soap.",
  },
  {
    id: 'd4',
    emoji: '🍜',
    name: 'Pad Thai',
    dates: 'Oct 3 – Oct 9',
    epitaph: 'Tasted better than it smelled.',
  },
];

/** Memorial wall: every tossed item as a tombstone with its epitaph. Opened from the "lost" tile. */
export default function MemorialScreen() {
  const { gone } = useFridge();
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const real: Stone[] = gone
    .filter((c) => c.status === 'lost')
    .map((c) => ({
      id: c.id,
      emoji: c.emoji,
      name: c.characterName,
      dates: `${formatShort(c.addedAt)} – ${formatShort(c.resolvedAt ?? c.expiresAt)}`,
      epitaph: c.epitaph ?? FALLBACK_EPITAPH,
    }));
  const lost = demo && USE_MOCK ? [...real, ...demoStones] : real;

  return (
    <Screen>
      <TopBar title="Memorial wall" />
      <AppText variant="small" color={colors.inkMuted} style={styles.sub}>
        {lost.length === 0
          ? 'Nobody lost yet. Keep it that way.'
          : `${lost.length} lost this month. Gone, not forgotten.`}
      </AppText>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {lost.map((c, i) => (
          <Animated.View
            key={c.id}
            entering={FadeInUp.delay(i * 80).duration(motion.base)}
            style={styles.cell}
          >
            <Tombstone emoji={c.emoji} name={c.name} dates={c.dates} epitaph={c.epitaph} />
          </Animated.View>
        ))}
        {lost.length === 0 && (
          <View style={styles.empty}>
            <AppText style={styles.emptyEmoji}>🕯️</AppText>
            <AppText variant="body" color={colors.inkMuted} align="center">
              When something expires and you toss it, it rests here.
            </AppText>
          </View>
        )}
      </ScrollView>

      <DockedFooter>
        <AppText variant="caption" color={colors.inkMuted} align="center">
          🕯️ Rest in pieces
        </AppText>
      </DockedFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  sub: { paddingHorizontal: space.xl, paddingBottom: space.md },
  grid: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cell: { width: '47%', flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', gap: space.md, paddingTop: space.huge, width: '100%' },
  emptyEmoji: { fontSize: 48, lineHeight: 56 },
});
