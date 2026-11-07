import { api } from '@/api/client';
import { mockScanResponse } from '@/api/mocks/scan';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Chip, PrimaryButton, RoundButton, SecondaryButton } from '@/components/Buttons';
import { CharacterCard } from '@/components/CharacterCard';
import { EmptyFridge } from '@/components/EmptyFridge';
import { useNudge } from '@/components/NudgeBanner';
import { StatsLine } from '@/components/Scoreboard';
import { GearIcon } from '@/components/Icons';
import { Screen } from '@/components/Screen';
import { SettingsSheet } from '@/components/SettingsSheet';
import { useFirstRun } from '@/logic/firstRun';
import { useSettings } from '@/logic/settings';
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
    hydrated,
    addScanned,
    skipDay,
    dayOffset,
  } = useFridge();
  const hint = useFlag('fridgemates.hint.moods.v1');
  const { demoMode } = useSettings();
  const { showToast } = useNudge();
  // Ghosts need action first, then the living, most urgent first.
  const rows = [...ghosts, ...characters];
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
    big,
  } = useLocalSearchParams<{
    skipWelcome?: string;
    demo?: string;
    menu?: string;
    hint?: string;
    big?: string;
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

  // Dev/demo params run only after the saved fridge is loaded, so hydration can't overwrite them.
  useEffect(() => {
    if (!hydrated) return;
    if (demo) loadDemo();
    if (big) {
      // Perf check: demo cast + two scans = 11 characters.
      loadDemo();
      setTimeout(() => addScanned(mockScanResponse.items), 50);
      setTimeout(() => addScanned(mockScanResponse.items), 100);
    }
    if (menu) setTimeout(() => setMenuOpen('settings'), 300);
    if (hintParam) hint.set(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, demo, menu, hintParam, big]);

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

  const ateIt = useCallback(
    (c: Character) => {
      rescueMany([c.id]);
      showToast(`${c.characterName} says thanks! +1 rescued`);
    },
    [rescueMany, showToast],
  );

  const tossGhost = useCallback(
    (g: Character) => {
      toss(g.id);
      showToast(`${g.characterName} has left the fridge. Rest easy.`);
    },
    [toss, showToast],
  );

  // Cold start: wait for storage so the empty state never flashes over a saved fridge.
  if (!ready || !welcomed || !hydrated) return <Screen />;

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
          <RoundButton
            icon={<GearIcon />}
            label="Settings"
            size={48}
            onPress={() => setMenuOpen('settings')}
          />
        </View>
        <StatsLine
          data={scoreboard}
          rescuedBump={recentRescue?.count ?? 0}
          onPressLost={() => router.push('/memorial')}
        />
        {demoMode && (
          <View style={styles.demoRow}>
            <Chip
              emoji="⏭"
              label={dayOffset ? `Skip ahead a day (+${dayOffset})` : 'Skip ahead a day'}
              tone="debug"
              onPress={skipDay}
            />
          </View>
        )}
        {rows.length > 0 && hint.ready && !hint.value && (
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
          data={rows}
          onScrollToIndexFailed={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          keyExtractor={(c) => c.id}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <CharacterCard
              character={item}
              onPress={openCharacter}
              onAte={ateIt}
              onToss={tossGhost}
              isNew={recentlyAddedIds.includes(item.id)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            {
              paddingTop: space.lg,
              paddingBottom: FOOTER_HEIGHT + insets.bottom,
            },
          ]}
          ListHeaderComponent={
            rows.length > 0 ? (
              <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
                Eat these first
              </AppText>
            ) : undefined
          }
          ListEmptyComponent={<EmptyFridge />}
          showsVerticalScrollIndicator={false}
        />
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
            label="Chat"
            accessibilityLabel="Open fridge chat"
            onPress={() => router.push('/chat')}
            style={styles.half}
          />
          <SecondaryButton
            emoji="🍳"
            label="Match"
            accessibilityLabel="Find a recipe match"
            onPress={() => router.push('/match')}
            style={styles.half}
          />
        </View>
        <PrimaryButton emoji="📷" label="Scan your fridge" big onPress={() => router.push('/scan')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sectionLabel: { marginBottom: space.sm, fontFamily: 'Nunito_800ExtraBold' },
  demoRow: { flexDirection: 'row' },
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
  list: { paddingHorizontal: space.xl },
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
