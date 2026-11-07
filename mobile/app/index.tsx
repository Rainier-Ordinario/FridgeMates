import { AppText } from '@/components/AppText';
import { Chip, PrimaryButton, RoundButton } from '@/components/Buttons';
import { CharacterCard } from '@/components/CharacterCard';
import { GhostLayer } from '@/components/GhostLayer';
import { Scoreboard } from '@/components/Scoreboard';
import { Screen } from '@/components/Screen';
import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
import { DemoMenu } from '@/components/DemoMenu';
import { EmptyFridge } from '@/components/EmptyFridge';
import { useFirstRun } from '@/logic/firstRun';
import { useFridge, type Character } from '@/logic/store';
import { colors, space } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
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
    loadDemo,
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
    setTimeout(() => router.push('/memorial'), 550);
  }
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Character>>(null);
  const { ready, welcomed, markWelcomed } = useFirstRun();
  // Dev/demo deep links: /?skipWelcome=1 marks first run done; /?demo=1 loads the demo cast.
  const { skipWelcome, demo, menu } = useLocalSearchParams<{
    skipWelcome?: string;
    demo?: string;
    menu?: string;
  }>();
  const [menuOpen, setMenuOpen] = useState(false);

  // First run: show the welcome screen instead of the fridge.
  useEffect(() => {
    if (!ready) return;
    if (skipWelcome && !welcomed) {
      markWelcomed();
      return;
    }
    if (!welcomed) router.replace('/welcome');
  }, [ready, welcomed, skipWelcome, markWelcomed]);

  useEffect(() => {
    if (demo) loadDemo();
    if (menu) setTimeout(() => setMenuOpen(true), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, menu]);

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

  if (!ready || !welcomed) return <Screen />;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            accessibilityRole="header"
            accessibilityLabel="FridgeMates"
            accessibilityHint="Long press for demo tools"
            delayLongPress={500}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setMenuOpen(true);
            }}
            style={{ flex: 1 }}
          >
            <AppText variant="display">FridgeMates</AppText>
            <AppText variant="body" color={colors.inkMuted}>
              Spoil alert: your food has feelings.
            </AppText>
          </Pressable>
          <Chip
            emoji="⏭"
            label={dayOffset === 0 ? 'Skip a day' : `Day +${dayOffset}`}
            tone="debug"
            onPress={skipDay}
          />
        </View>
        <Scoreboard
          data={scoreboard}
          rescuedBump={recentRescue?.count ?? 0}
          onPressLost={() => router.push('/memorial')}
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
            { paddingBottom: (ghosts.length ? 210 : 140) + insets.bottom },
          ]}
          ListHeaderComponent={
            characters.length > 0 ? (
              <AppText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
                MOST URGENT FIRST
              </AppText>
            ) : undefined
          }
          ListEmptyComponent={<EmptyFridge />}
          showsVerticalScrollIndicator={false}
        />
        <GhostLayer ghosts={ghosts} onPress={openCharacter} />
      </View>

      <DemoMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,247,236,0)', colors.bg, colors.bg]}
        locations={[0, 0.45, 1]}
        style={[styles.fade, { height: (ghosts.length ? 220 : 150) + insets.bottom }]}
      />
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {ghosts.length > 0 && (
          <PrimaryButton
            emoji="🗑️"
            label={ghosts.length === 1 ? 'Take out the trash' : `Take out the trash (${ghosts.length})`}
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
