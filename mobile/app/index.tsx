import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Chip, PrimaryButton, RoundButton, SecondaryButton } from '@/components/Buttons';
import { CharacterCard } from '@/components/CharacterCard';
import { EmptyFridge } from '@/components/EmptyFridge';
import { GhostLayer } from '@/components/GhostLayer';
import { StatsLine } from '@/components/Scoreboard';
import { Screen } from '@/components/Screen';
import { SettingsSheet } from '@/components/SettingsSheet';
import { useFirstRun } from '@/logic/firstRun';
import { useFlag } from '@/logic/flags';
import { useFridge, type Character } from '@/logic/store';
import { colors, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOOTER_HEIGHT = 150;

/** Fridge (home): header, characters sorted by urgency, and one big Scan button. */
export default function FridgeScreen() {
  const {
    characters,
    ghosts,
    scoreboard,
    recentlyAddedIds,
    clearRecentlyAdded,
    recentRescue,
    clearRecentRescue,
    setEpitaph,
    toss,
    loadDemo,
    rescueMany,
  } = useFridge();
  const hint = useFlag('fridgemates.hint.moods.v1');
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Character>>(null);
  const requestedEpitaphs = useRef(new Set<string>());
  const { ready, welcomed, markWelcomed } = useFirstRun();
  // Dev/demo deep links: /?skipWelcome=1 marks first run done; /?demo=1 loads the cast; /?menu=1 opens settings.
  const {
    skipWelcome,
    demo,
    menu,
    hint: hintParam,
  } = useLocalSearchParams<{
    skipWelcome?: string;
    demo?: string;
    menu?: string;
    hint?: string;
  }>();
  const [menuOpen, setMenuOpen] = useState<false | 'settings' | 'demo'>(false);

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
    if (menu) setTimeout(() => setMenuOpen('settings'), 300);
    if (hintParam) hint.set(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, menu, hintParam]);

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

  // After a rescue: show +N on the stats line for a few seconds.
  useEffect(() => {
    if (!recentRescue) return;
    const t = setTimeout(clearRecentRescue, 6000);
    return () => clearTimeout(t);
  }, [recentRescue, clearRecentRescue]);

  const openCharacter = useCallback((c: Character) => {
    router.push({ pathname: '/item/[id]', params: { id: c.id } });
  }, []);

  const ateIt = useCallback((c: Character) => rescueMany([c.id]), [rescueMany]);

  const tossGhost = useCallback(
    (g: Character) => {
      toss(g.id);
      // Let the ghost drift up and fade (500 ms) before showing the wall.
      setTimeout(() => router.push('/memorial'), 550);
    },
    [toss],
  );

  if (!ready || !welcomed) return <Screen />;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            accessibilityRole="header"
            accessibilityLabel="FridgeMates"
            accessibilityHint="Long press for settings"
            delayLongPress={500}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setMenuOpen('demo');
            }}
            style={{ flex: 1 }}
          >
            <AppText variant="display">FridgeMates</AppText>
            <AppText variant="body" color={colors.inkMuted}>
              Spoil alert: your food has feelings.
            </AppText>
          </Pressable>
          <RoundButton emoji="⚙️" label="Settings" size={48} onPress={() => setMenuOpen('settings')} />
        </View>
        <StatsLine
          data={scoreboard}
          rescuedBump={recentRescue?.count ?? 0}
          onPressLost={() => router.push('/memorial')}
        />
        {characters.length > 0 && hint.ready && !hint.value && (
          <View
            style={styles.hint}
            accessible
            accessibilityLabel="Tip: the more worried they look, the sooner you should eat them."
          >
            <AppText style={styles.hintEmoji}>💡</AppText>
            <AppText variant="body" style={{ flex: 1 }}>
              The more worried they look, the sooner you should eat them.
            </AppText>
            <Chip label="Got it" onPress={() => hint.set(true)} />
          </View>
        )}
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
              onAte={ateIt}
              isNew={recentlyAddedIds.includes(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: FOOTER_HEIGHT + insets.bottom }]}
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
        <GhostLayer ghosts={ghosts} onPress={openCharacter} onToss={tossGhost} />
      </View>

      <SettingsSheet
        visible={menuOpen !== false}
        demoFirst={menuOpen === 'demo'}
        onClose={() => setMenuOpen(false)}
      />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,247,236,0)', colors.bg, colors.bg]}
        locations={[0, 0.4, 1]}
        style={[styles.fade, { height: FOOTER_HEIGHT + 20 + insets.bottom }]}
      />
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 24) + 10 }]}>
        <View style={styles.secondaryRow}>
          <SecondaryButton
            emoji="💬"
            label="Fridge chat"
            onPress={() => router.push('/chat')}
            style={styles.half}
          />
          <SecondaryButton
            emoji="🍳"
            label="What to cook?"
            onPress={() => router.push('/match')}
            style={styles.half}
          />
        </View>
        <PrimaryButton emoji="📷" label="Scan food" onPress={() => router.push('/scan')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sectionLabel: { marginBottom: space.sm, letterSpacing: 1 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.xs,
  },
  hintEmoji: { fontSize: 22, lineHeight: 28 },
  listArea: { flex: 1 },
  list: { paddingHorizontal: space.xl, paddingTop: space.lg },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    zIndex: 20,
  },
  secondaryRow: { flexDirection: 'row', gap: space.md },
  half: { flex: 1, paddingHorizontal: space.sm },
});
