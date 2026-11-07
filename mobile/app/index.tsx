import { api } from '@/api/client';
import { mockScanResponse } from '@/api/mocks/scan';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { UiIcon } from '@/components/FoodIcon';
import { Chip, PrimaryButton, RoundButton, SecondaryButton } from '@/components/Buttons';
import { CharacterCard } from '@/components/CharacterCard';
import { EmptyFridge } from '@/components/EmptyFridge';
import { useNudge } from '@/components/NudgeBanner';
import { StatsLine } from '@/components/Scoreboard';
import { GearIcon } from '@/components/Icons';
import { ManagerSheet } from '@/components/ManagerSheet';
import { Mascot, type MascotExpression, type MascotState } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SettingsSheet } from '@/components/SettingsSheet';
import { useFirstRun } from '@/logic/firstRun';
import { urgencyLabel, urgencyOf, type Urgency } from '@/logic/overview';
import { avatarIcon, useSettings } from '@/logic/settings';
import { useFlag } from '@/logic/flags';
import { useFridge, type Character } from '@/logic/store';
import { colors, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOOTER_HEIGHT = 150;

type SortMode = 'expiry' | 'alphabetical' | 'newest';

const sortOptions: { label: string; value: SortMode }[] = [
  { label: 'Expiry', value: 'expiry' },
  { label: 'A–Z', value: 'alphabetical' },
  { label: 'Newest', value: 'newest' },
];

function matchesSearch(character: Character, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return (
    character.name.toLocaleLowerCase().includes(q) || character.characterName.toLocaleLowerCase().includes(q)
  );
}

function sortCharacters(characters: Character[], sortMode: SortMode): Character[] {
  return [...characters].sort((a, b) => {
    if (sortMode === 'alphabetical') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (sortMode === 'newest') {
      const newestFirst = b.addedAt.localeCompare(a.addedAt);
      if (newestFirst !== 0) return newestFirst;
    } else {
      const soonestFirst = a.daysLeft - b.daysLeft;
      if (soonestFirst !== 0) return soonestFirst;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function sectionTitle(sortMode: SortMode): string {
  if (sortMode === 'alphabetical') return 'A to Z';
  if (sortMode === 'newest') return 'Newest first';
  return 'Eat these first';
}

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
  const { demoMode, avatar } = useSettings();
  const { showToast } = useNudge();
  const [cheer, setCheer] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerQuestion, setManagerQuestion] = useState<string | null>(null);
  // Ghosts need action first, then the living, most urgent first.
  const rows = [...ghosts, ...characters];
  // Search and sort (Kerwin): filter by food or character name; sort by expiry, A–Z, or newest.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('expiry');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | null>(null);
  const visibleRows = useMemo(
    () =>
      sortCharacters(
        rows.filter(
          (c) => matchesSearch(c, searchQuery) && (!urgencyFilter || urgencyOf(c) === urgencyFilter),
        ),
        sortMode,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ghosts, characters, searchQuery, sortMode, urgencyFilter],
  );
  function toggleSearch() {
    Haptics.selectionAsync();
    if (searchOpen) setSearchQuery('');
    setSearchOpen((open) => !open);
  }
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
    manager,
    urgency,
    t,
    ask,
  } = useLocalSearchParams<{
    skipWelcome?: string;
    demo?: string;
    menu?: string;
    hint?: string;
    big?: string;
    manager?: string;
    urgency?: string;
    t?: string;
    ask?: string;
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
    if (manager) {
      setTimeout(() => {
        if (ask) setManagerQuestion(ask);
        setManagerOpen(true);
      }, 300);
    }
    if (urgency) setTimeout(() => setUrgencyFilter(urgency as Urgency), 0);
    if (hintParam) hint.set(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, demo, menu, hintParam, big, manager, urgency, t, ask]);

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
    const index = visibleRows.findIndex((c) => recentlyAddedIds.includes(c.id));
    if (index >= 0) {
      setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.2, animated: true }), 350);
    }
    const t = setTimeout(clearRecentlyAdded, 6000);
    return () => clearTimeout(t);
  }, [recentlyAddedIds, visibleRows, clearRecentlyAdded]);

  // After a rescue: show +N on the stats line for a few seconds.
  useEffect(() => {
    if (!recentRescue) return;
    const on = setTimeout(() => setCheer(true), 0);
    const off = setTimeout(() => setCheer(false), 1700);
    const t = setTimeout(clearRecentRescue, 6000);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
      clearTimeout(t);
    };
  }, [recentRescue, clearRecentRescue]);

  // The manager's mood follows the fridge: sleepy when empty, sad with ghosts, happy otherwise.
  const mascotExpression: MascotExpression =
    rows.length === 0 ? 'sleepy' : ghosts.length > 0 ? 'sad' : 'happy';
  const mascotState: MascotState = cheer ? 'goodNews' : rows.length === 0 ? 'empty' : 'idle';

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
          </Pressable>
          <RoundButton
            icon={<UiIcon icon={avatarIcon(avatar)} size={26} />}
            label="Open fridge overview"
            size={48}
            onPress={() => router.push('/overview')}
          />
          <RoundButton
            icon={<GearIcon />}
            label="Settings"
            size={48}
            onPress={() => setMenuOpen('settings')}
          />
        </View>
        <AppText variant="body" color={colors.inkMuted} style={styles.tagline}>
          Spoil alert: your food has feelings.
        </AppText>
        <StatsLine
          data={scoreboard}
          rescuedBump={recentRescue?.count ?? 0}
          onPressLost={() => router.push('/memorial')}
        />
        {demoMode && (
          <View style={styles.demoRow}>
            <Chip
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
            <UiIcon icon="light-bulb" size={24} />
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
          data={visibleRows}
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
              <View style={styles.listHeader}>
                <View style={styles.listControls}>
                  <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
                    {sectionTitle(sortMode)}
                  </AppText>
                  <View style={styles.headerChips}>
                    {urgencyFilter && (
                      <Chip
                        label={`${urgencyLabel[urgencyFilter]} ✕`}
                        tone="debug"
                        onPress={() => setUrgencyFilter(null)}
                      />
                    )}
                    <Chip
                      icon={<UiIcon icon="magnifying-glass-tilted-left" size={16} />}
                      label={searchOpen ? 'Close' : 'Search'}
                      onPress={toggleSearch}
                    />
                  </View>
                </View>
                {searchOpen && (
                  <>
                    <TextInput
                      accessibilityLabel="Search food in your fridge"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      onChangeText={setSearchQuery}
                      placeholder="Search food..."
                      placeholderTextColor={colors.inkMuted}
                      returnKeyType="search"
                      style={styles.searchInput}
                      value={searchQuery}
                    />
                    <View style={styles.sortRow} accessibilityLabel="Sort">
                      {sortOptions.map((option) => {
                        const selected = sortMode === option.value;
                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Sort by ${option.label}`}
                            accessibilityState={{ selected }}
                            key={option.value}
                            onPress={() => setSortMode(option.value)}
                            style={({ pressed }) => [
                              styles.sortOption,
                              selected && styles.sortOptionActive,
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <AppText variant="caption" color={colors.ink}>
                              {option.label}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}
                {(searchQuery.trim() || urgencyFilter) && visibleRows.length === 0 ? (
                  <AppText variant="body" color={colors.inkMuted} align="center" style={styles.emptySearch}>
                    {urgencyFilter && !searchQuery.trim()
                      ? `Nothing under “${urgencyLabel[urgencyFilter]}”.`
                      : 'No food matches that search.'}
                  </AppText>
                ) : null}
              </View>
            ) : undefined
          }
          ListEmptyComponent={<EmptyFridge />}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <ManagerSheet
        visible={managerOpen}
        initialQuestion={managerQuestion}
        onClose={() => {
          setManagerOpen(false);
          setManagerQuestion(null);
        }}
      />

      <SettingsSheet
        onTestSafety={() => {
          setManagerQuestion('this fridge is bullshit');
          setManagerOpen(true);
        }}
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
            icon={<UiIcon icon="speech-balloon" size={20} />}
            label="Chat"
            accessibilityLabel="Open fridge chat"
            onPress={() => router.push('/chat')}
            style={styles.half}
          />
          <SecondaryButton
            icon={<UiIcon icon="cooking" size={20} />}
            label="Match"
            accessibilityLabel="Find a recipe match"
            onPress={() => router.push('/match')}
            style={styles.half}
          />
        </View>
        <View style={styles.scanRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask the fridge manager"
            onPress={() => {
              Haptics.selectionAsync();
              setManagerOpen(true);
            }}
            style={({ pressed }) => [styles.mascotButton, pressed && { opacity: 0.85 }]}
          >
            <Mascot
              size={44}
              state={mascotState}
              expression={cheer ? 'excited' : mascotExpression}
              hideBubble
              accessibilityLabel=""
            />
          </Pressable>
          <PrimaryButton
            icon={<UiIcon icon="camera" size={24} />}
            label="Scan your fridge"
            big
            onPress={() => router.push('/scan')}
            style={styles.scan}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.sm },
  tagline: { marginTop: -space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  sectionLabel: { fontFamily: 'Nunito_800ExtraBold' },
  listHeader: { gap: space.sm, paddingBottom: space.sm },
  headerChips: { flexDirection: 'row', gap: space.xs },
  listControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: space.md,
    fontFamily: 'Nunito_500Medium',
    fontSize: 16,
  },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  sortOption: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  sortOptionActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.brand },
  emptySearch: { paddingTop: space.lg },
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
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  scan: { flex: 1 },
  mascotButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  half: { flex: 1, paddingHorizontal: space.sm },
});
