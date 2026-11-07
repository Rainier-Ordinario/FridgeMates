import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { UiIcon } from '@/components/FoodIcon';
import { Mascot } from '@/components/Mascot';
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
import { colors, moods, radius, shadow, space } from '@/theme';
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

/** Page 2 of the home pager: profile-lite, stats, what's inside, and the manager's summary. */
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
        style={styles.statsGrid}
        accessibilityLabel={`${scoreboard.rescued} rescued, ${scoreboard.lost} lost, ${formatDollars(scoreboard.savedDollars)} saved, rescue rate ${rate}`}
      >
        <StatTile value={String(scoreboard.rescued)} label="rescued" color={colors.successText} />
        <StatTile value={String(scoreboard.lost)} label="lost" color={colors.dangerStrong} />
        <StatTile value={formatDollars(scoreboard.savedDollars)} label="saved" color={colors.ink} />
        <StatTile value={rate} label="rescue rate" color={colors.ink} />
      </View>

      {empty ? (
        <View style={styles.empty}>
          <Mascot
            size={110}
            state="empty"
            expression="sleepy"
            line="Nothing in here yet. Scan your fridge to meet everyone."
            accessibilityLabel="The fridge manager is asleep. Nothing in here yet."
          />
          <PrimaryButton
            icon={<UiIcon icon="camera" size={24} />}
            label="Scan your first food"
            onPress={() => router.push('/scan')}
          />
        </View>
      ) : (
        <>
          <AppText variant="heading" accessibilityRole="header">
            What’s inside
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
                <AppText style={styles.tileLabel} color={m.text}>
                  {urgencyLabel[key]}
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.categories}>
            {groups.map((g) => (
              <View
                key={g.category}
                style={styles.categoryRow}
                accessible
                accessibilityLabel={`${g.category}: ${g.count}`}
              >
                <AppText
                  variant="bodyBold"
                  color={g.count ? colors.ink : colors.inkMuted}
                  style={{ flex: 1 }}
                >
                  {g.category}
                </AppText>
                <View style={styles.categoryFaces}>
                  {g.faces.map((c, i) => (
                    <View
                      key={c.id}
                      style={[styles.categoryFace, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}
                    >
                      <Face
                        food={c.name}
                        emoji={c.emoji}
                        mood={c.mood}
                        size={36}
                        showBadge={false}
                        animated={false}
                        label={c.characterName}
                      />
                    </View>
                  ))}
                </View>
                <AppText
                  variant="heading"
                  color={g.count ? colors.ink : colors.inkMuted}
                  style={styles.categoryCount}
                >
                  {g.count}
                </AppText>
              </View>
            ))}
          </View>

          <AppText variant="body" color={colors.inkMuted} align="center">
            About {formatDollars(value)} of food in here right now.
          </AppText>

          <View style={styles.mascot}>
            <Mascot
              size={110}
              state={summary.happy ? 'idle' : 'badNews'}
              expression={summary.happy ? 'happy' : 'sad'}
              line={summary.text}
              accessibilityLabel={`The fridge manager says: ${summary.text}`}
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
      <AppText style={styles.tileValue} color={color}>
        {value}
      </AppText>
      <AppText style={styles.tileLabel} color={colors.inkMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    width: '47%',
    flexGrow: 1,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    gap: 2,
    ...shadow.card,
  },
  mascot: { alignItems: 'center', paddingTop: space.lg },
  empty: { alignItems: 'center', gap: space.xl, paddingTop: space.lg },
  urgencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  urgencyTile: {
    width: '47%',
    flexGrow: 1,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    gap: 2,
  },
  categories: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    ...shadow.card,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  categoryFaces: { flexDirection: 'row' },
  categoryFace: { borderRadius: 20, borderWidth: 2, borderColor: colors.surface },
  categoryCount: { minWidth: 28, textAlign: 'right' },
  tileValue: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18 },
});
