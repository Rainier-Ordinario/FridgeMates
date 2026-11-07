import { AppText } from '@/components/AppText';
import { Chip, PrimaryButton, RoundButton } from '@/components/Buttons';
import { CharacterCard } from '@/components/CharacterCard';
import { GhostLayer } from '@/components/GhostLayer';
import { Scoreboard } from '@/components/Scoreboard';
import { Screen } from '@/components/Screen';
import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
import { useFridge, type Character } from '@/logic/store';
import { colors, space } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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
    setEpitaph,
    toss,
  } = useFridge();
  const requestedEpitaphs = useRef(new Set<string>());

  // Ask /ghost for an epitaph as soon as something expires, so the memorial is ready when it's tossed.
  useEffect(() => {
    ghosts
      .filter((g) => !g.epitaph && !requestedEpitaphs.current.has(g.id))
      .forEach((g) => {
        requestedEpitaphs.current.add(g.id);
        api
          .ghost({ item: toChatItem(g, g.daysLeft) })
          .then((res) => setEpitaph(g.id, res.epitaph))
          .catch(() => setEpitaph(g.id, `Here lies ${g.name}. The fridge was not enough.`));
      });
  }, [ghosts, setEpitaph]);

  function takeOutTrash() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ghosts.forEach((g) => toss(g.id));
    // Let the ghosts drift up and fade (500 ms) before showing the wall.
    setTimeout(() => router.push('/memorial' as never), 550);
  }
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
          onPressLost={() => router.push('/memorial' as never)}
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
          contentContainerStyle={[
            styles.list,
            { paddingBottom: getBottomPadding(ghosts.length, insets.bottom) },
          ]}
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
        style={[styles.fade, { height: getFadeHeight(ghosts.length, insets.bottom) }]}
      />
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {ghosts.length > 0 && (
          <PrimaryButton
            emoji="🗑️"
            label={getTrashLabel(ghosts.length)}
            tone="danger"
            onPress={takeOutTrash}
            style={styles.trash}
          />
        )}
        <View style={styles.actionRow}>
          <RoundButton emoji="💬" label="Fridge group chat" onPress={() => router.push('/chat')} />
          <PrimaryButton
            emoji="📷"
            label="Scan food"
            onPress={() => router.push('/scan')}
            style={styles.scan}
          />
          <RoundButton emoji="💘" label="Matchmaking" onPress={() => router.push('/match')} />
        </View>
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

function getBottomPadding(ghostCount: number, inset: number): number {
  let padding = 140;
  if (ghostCount > 0) {
    padding = 210;
  }
  return padding + inset;
}

function getFadeHeight(ghostCount: number, inset: number): number {
  let height = 150;
  if (ghostCount > 0) {
    height = 220;
  }
  return height + inset;
}

function getTrashLabel(ghostCount: number): string {
  if (ghostCount === 1) {
    return 'Take out the trash';
  }
  return `Take out the trash (${ghostCount})`;
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
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    zIndex: 20,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  trash: { alignSelf: 'stretch' },
  scan: { flex: 1 },
});
