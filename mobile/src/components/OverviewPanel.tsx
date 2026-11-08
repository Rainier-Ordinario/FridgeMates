import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { UiIcon } from '@/components/FoodIcon';
import { Mascot } from '@/components/Mascot';
import { SpeechBubble } from '@/components/SpeechBubble';
import {
  categoryGroups,
  fridgeValue,
  summaryLine,
  urgencyBuckets,
  urgencyLabel,
  type Urgency,
} from '@/logic/overview';
import { formatDollars } from '@/logic/prices';
import { useFridge } from '@/logic/store';
import { colors, moods, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface Props {
  /** Tapping an urgency tile: the Fridge page applies this filter and swipes back. */
  onShowUrgency: (urgency: Urgency) => void;
  /** Space to leave for the docked buttons. */
  bottomPadding: number;
}

/** Page 2 of the home pager: stats, what's inside (urgency + categories), and the manager's one-line summary. */
export function OverviewPanel({ onShowUrgency, bottomPadding }: Props) {
  const { scoreboard, characters, ghosts } = useFridge();
  const buckets = urgencyBuckets(characters, ghosts);
  const groups = categoryGroups(characters);
  const value = fridgeValue(characters);
  const summary = summaryLine(buckets);
  const empty = characters.length + ghosts.length === 0;

  const decided = scoreboard.rescued + scoreboard.lost;
  const rate = decided > 0 ? `${Math.round((100 * scoreboard.rescued) / decided)}%` : '–';

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <View
        style={styles.statsRow}
        accessibilityLabel={`${scoreboard.rescued} rescued, ${scoreboard.lost} lost, ${formatDollars(scoreboard.savedDollars)} saved, rescue rate ${rate}`}
      >
        <StatTile value={String(scoreboard.rescued)} label="rescued" color={colors.successText} />
        <StatTile value={String(scoreboard.lost)} label="lost" color={colors.dangerStrong} />
        <StatTile value={formatDollars(scoreboard.savedDollars)} label="saved" color={colors.ink} />
        <StatTile value={rate} label="rescue %" color={colors.ink} />
      </View>

      {empty ? (
        <View style={styles.empty}>
          <Mascot
            size={80}
            state="empty"
            expression="sleepy"
            line="Nothing in here yet. Scan your fridge to meet everyone."
            accessibilityLabel="The fridge manager is asleep. Nothing in here yet."
          />
          <PrimaryButton
            icon={<UiIcon icon="camera" size={22} />}
            label="Scan your first food"
            onPress={() => router.push('/scan')}
          />
        </View>
      ) : (
        <>
          <AppText variant="sectionLabel" color={colors.inkMuted} accessibilityRole="header">
            What’s inside · {scoreboard.inFridge}
          </AppText>
          <View style={styles.urgencyGrid}>
            {(
              [
                ['today', moods.dramatic],
                ['week', moods.nervous],
                ['good', moods.cocky],
                ['expired', moods.ghost],
              ] as const
            ).map(([key, m]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${buckets[key].length} ${urgencyLabel[key]}. Show them on the fridge`}
                onPress={() => {
                  Haptics.selectionAsync();
                  onShowUrgency(key);
                }}
                style={({ pressed }) => [
                  styles.urgencyTile,
                  { backgroundColor: m.tint, borderColor: m.color },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <AppText style={styles.tileValue} color={m.text}>
                  {buckets[key].length}
                </AppText>
                <AppText style={styles.tileLabel} color={m.text} numberOfLines={1}>
                  {urgencyLabel[key]}
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.categoryGrid}>
            {groups.map((g) => (
              <View
                key={g.category}
                style={styles.categoryTile}
                accessible
                accessibilityLabel={`${g.category}: ${g.count}`}
              >
                <AppText
                  style={styles.categoryName}
                  color={g.count ? colors.ink : colors.inkMuted}
                  numberOfLines={1}
                >
                  {g.category}
                </AppText>
                <View style={styles.categoryBottom}>
                  <View style={styles.categoryFaces}>
                    {g.faces.slice(0, 3).map((c, i) => (
                      <View
                        key={c.id}
                        style={[styles.categoryFace, { marginLeft: i === 0 ? 0 : -7, zIndex: 10 - i }]}
                      >
                        <Face
                          food={c.name}
                          mood={c.mood}
                          size={24}
                          showBadge={false}
                          animated={false}
                          expression={false}
                        />
                      </View>
                    ))}
                  </View>
                  <AppText style={styles.categoryCount} color={g.count ? colors.ink : colors.inkMuted}>
                    {g.count}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <View
            style={styles.mascotRow}
            accessible
            accessibilityLabel={`The fridge manager says: ${summary.text} About ${formatDollars(value)} of food in here right now.`}
          >
            <Mascot
              size={44}
              state={summary.happy ? 'idle' : 'badNews'}
              expression={summary.happy ? 'happy' : 'sad'}
              hideBubble
              accessibilityLabel=""
            />
            <SpeechBubble
              compact
              text={`${summary.text} About ${formatDollars(value)} of food in here right now.`}
              style={styles.bubble}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StatTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.tile}>
      <AppText style={styles.tileValue} color={color} numberOfLines={1}>
        {value}
      </AppText>
      <AppText style={styles.tileLabel} color={colors.inkMuted} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.md },
  statsRow: { flexDirection: 'row', gap: space.sm },
  tile: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    gap: 0,
    ...shadow.card,
  },
  empty: { alignItems: 'center', gap: space.lg, paddingTop: space.md },
  urgencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  urgencyTile: {
    width: '48%',
    flexGrow: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tileValue: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18, flexShrink: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  categoryTile: {
    width: '31%',
    flexGrow: 1,
    height: 72,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
    ...shadow.card,
  },
  categoryName: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18 },
  categoryBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryFaces: { flexDirection: 'row', minHeight: 24 },
  categoryFace: { borderRadius: 14, borderWidth: 2, borderColor: colors.surface },
  categoryCount: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  bubble: { flex: 1 },
});
