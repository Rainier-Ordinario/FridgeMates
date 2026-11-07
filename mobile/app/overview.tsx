import { AppText } from '@/components/AppText';
import { Face } from '@/components/Face';
import { Mascot } from '@/components/Mascot';
import { PrimaryButton } from '@/components/Buttons';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import {
  categoryGroups,
  fridgeValue,
  summaryLine,
  urgencyBuckets,
  urgencyLabel,
  type Urgency,
} from '@/logic/overview';
import { formatDollars } from '@/logic/prices';
import { AVATARS, useSettings, type Avatar } from '@/logic/settings';
import { useFridge } from '@/logic/store';
import { colors, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

/** My Fridge: a profile-lite overview of the fridge. */
export default function OverviewScreen() {
  const { scoreboard, characters, ghosts } = useFridge();
  const buckets = urgencyBuckets(characters, ghosts);
  const groups = categoryGroups(characters);
  const value = fridgeValue(characters);
  const summary = summaryLine(buckets);
  const empty = characters.length + ghosts.length === 0;
  const settings = useSettings();
  const [name, setName] = useState(settings.fridgeName);
  const nonce = useRef(0);
  useEffect(() => {
    const id = setTimeout(() => setName(settings.fridgeName), 0);
    return () => clearTimeout(id);
  }, [settings.fridgeName]);

  const decided = scoreboard.rescued + scoreboard.lost;
  const rate = decided > 0 ? `${Math.round((100 * scoreboard.rescued) / decided)}%` : '–';

  function saveName() {
    const trimmed = name.trim() || 'My fridge';
    setName(trimmed);
    settings.set('fridgeName', trimmed);
  }

  function showOnFridge(urgency: Urgency) {
    Haptics.selectionAsync();
    // Back to the Fridge with the filter applied (reuses the search/sort list).
    router.navigate({ pathname: '/', params: { urgency, t: String(++nonce.current) } });
  }

  function pickAvatar(a: Avatar) {
    Haptics.selectionAsync();
    settings.set('avatar', a);
  }

  return (
    <Screen>
      <TopBar title="My Fridge" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.profile}>
          <View style={styles.avatarBig}>
            <AppText style={styles.avatarBigText}>{settings.avatar}</AppText>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            maxLength={24}
            returnKeyType="done"
            accessibilityLabel="Fridge name"
            placeholder="My fridge"
            placeholderTextColor={colors.inkMuted}
            style={styles.nameInput}
          />
          <View style={styles.avatarRow} accessibilityLabel="Choose an avatar">
            {AVATARS.map((a) => {
              const selected = a === settings.avatar;
              return (
                <Pressable
                  key={a}
                  accessibilityRole="button"
                  accessibilityLabel={`Avatar ${a}`}
                  accessibilityState={{ selected }}
                  onPress={() => pickAvatar(a)}
                  style={({ pressed }) => [
                    styles.avatarOption,
                    selected && styles.avatarSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <AppText style={styles.avatarOptionText}>{a}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

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
            <PrimaryButton emoji="📷" label="Scan your fridge" onPress={() => router.push('/scan')} />
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
                  onPress={() => showOnFridge(key)}
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
    </Screen>
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
  scroll: {
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    gap: space.lg,
    paddingBottom: space.huge,
  },
  profile: {
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    ...shadow.card,
  },
  avatarBig: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBigText: { fontSize: 44, lineHeight: 54 },
  nameInput: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
    paddingVertical: space.xs,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.line,
  },
  avatarRow: { flexDirection: 'row', gap: space.sm },
  avatarOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { borderColor: colors.brand, backgroundColor: colors.surfaceAlt },
  avatarOptionText: { fontSize: 24, lineHeight: 30 },
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
