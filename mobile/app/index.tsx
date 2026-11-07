import { AppText } from '@/components/AppText';
import { Chip, PrimaryButton, RoundButton } from '@/components/Buttons';
import { CharacterCard } from '@/components/CharacterCard';
import { GhostLayer } from '@/components/GhostLayer';
import { Scoreboard } from '@/components/Scoreboard';
import { Screen } from '@/components/Screen';
import { useFridge, type Character } from '@/logic/store';
import { colors, space } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Fridge (home): characters sorted by fewest days left, scoreboard, big scan button. */
export default function FridgeScreen() {
  const {
    characters,
    ghosts,
    scoreboard,
    dayOffset,
    skipDay,
    recentlyAddedIds,
    clearRecentlyAdded,
    recentRescue,
    clearRecentRescue,
  } = useFridge();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Character>>(null);

  // After a scan: scroll to the first new character, keep the highlight for a few seconds.
  useEffect(() => {
    if (recentlyAddedIds.length === 0) return;
    const index = characters.findIndex((c) => recentlyAddedIds.includes(c.id));
    if (index >= 0) {
      setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.2, animated: true }), 350);
    }
    const t = setTimeout(clearRecentlyAdded, 6000);
    return () => clearTimeout(t);
  }, [recentlyAddedIds, characters, clearRecentlyAdded]);

  // After "I cooked it": show +N on the rescued tile for a few seconds.
  useEffect(() => {
    if (!recentRescue) return;
    const t = setTimeout(clearRecentRescue, 6000);
    return () => clearTimeout(t);
  }, [recentRescue, clearRecentRescue]);

  const openCharacter = useCallback((c: Character) => {
    router.push({ pathname: '/item/[id]', params: { id: c.id } });
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="display">FridgeMates</AppText>
            <AppText variant="body" color={colors.inkMuted}>
              Spoil alert: your food has feelings.
            </AppText>
          </View>
          <Chip
            emoji="⏭"
            label={getDayLabel(dayOffset)}
            tone="debug"
            onPress={skipDay}
          />
        </View>
        <Scoreboard
          data={scoreboard}
          rescuedBump={recentRescue?.count ?? 0}
          onPressLost={() => console.log('TODO memorial')}
        />
      </View>

      <View style={styles.listArea}>
        <FlatList
          ref={listRef}
          data={characters}
          onScrollToIndexFailed={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CharacterCard
              character={item}
              onPress={openCharacter}
              isNew={recentlyAddedIds.includes(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 140 + insets.bottom }]}
          ListHeaderComponent={
            <AppText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
              {getSectionLabel(characters.length)}
            </AppText>
          }
          showsVerticalScrollIndicator={false}
        />
        <GhostLayer ghosts={ghosts} onPress={openCharacter} />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,247,236,0)', colors.bg, colors.bg]}
        locations={[0, 0.45, 1]}
        style={[styles.fade, { height: 150 + insets.bottom }]}
      />
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <RoundButton emoji="💬" label="Fridge group chat" onPress={() => router.push('/chat')} />
        <PrimaryButton
          emoji="📷"
          label="Scan food"
          onPress={() => router.push('/scan')}
          style={styles.scan}
        />
        <RoundButton emoji="💘" label="Matchmaking" onPress={() => router.push('/match')} />
      </View>
    </Screen>
  );
}

function getDayLabel(dayOffset: number): string {
  if (dayOffset === 0) {
    return 'Skip a day';
  }
  return `Day +${dayOffset}`;
}

function getSectionLabel(characterCount: number): string {
  if (characterCount === 0) {
    return 'Your fridge is quiet. Suspiciously quiet.';
  }
  return 'MOST URGENT FIRST';
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sectionLabel: { marginBottom: space.sm, letterSpacing: 1 },
  listArea: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingTop: space.xl },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    zIndex: 20,
  },
  scan: { flex: 1 },
});
