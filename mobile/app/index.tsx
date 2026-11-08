import { api } from '@/api/client';
import { mockScanResponse } from '@/api/mocks/scan';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { UiIcon } from '@/components/FoodIcon';
import { Chip, PrimaryButton } from '@/components/Buttons';
import { CloseIcon } from '@/components/Icons';
import { CharacterCard } from '@/components/CharacterCard';
import { closeOpenRow } from '@/components/FoodRow';
import { EmptyFridge } from '@/components/EmptyFridge';
import { useNudge } from '@/components/NudgeBanner';
import { StatsLine } from '@/components/Scoreboard';
import { ManagerSheet } from '@/components/ManagerSheet';
import { Mascot, type MascotExpression, type MascotState } from '@/components/Mascot';
import { OverviewPanel } from '@/components/OverviewPanel';
import { ProfilePicture } from '@/components/ProfilePicture';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { SettingsSheet } from '@/components/SettingsSheet';
import { deleteCrop } from '@/logic/crops';
import { useFirstRun } from '@/logic/firstRun';
import type { ManagerQuestion } from '@/logic/manager';
import { urgencyLabel, urgencyOf, type Urgency } from '@/logic/overview';
import { useSettings } from '@/logic/settings';
import { useFlag } from '@/logic/flags';
import { useFridge, type Character } from '@/logic/store';
import { colors, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOOTER_HEIGHT = 72;
/** The title row collapses over the first 24pt of list scroll. */
const TITLE_ROW = 44;
const COLLAPSE_AT = 24;

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
    all,
    characters,
    ghosts,
    scoreboard,
    recentlyAddedIds,
    clearRecentlyAdded,
    recentRescue,
    clearRecentRescue,
    setEpitaph,
    toss,
    remove,
    restore,
    loadDemo,
    rescueMany,
    hydrated,
    addScanned,
    skipDay,
    dayOffset,
  } = useFridge();
  const hint = useFlag('fridgemates.hint.moods.v1');
  const { demoMode, fridgeName } = useSettings();
  const { showToast } = useNudge();
  const [cheer, setCheer] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerQuestion, setManagerQuestion] = useState<string | null>(null);
  const [managerChip, setManagerChip] = useState<ManagerQuestion | null>(null);
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
  // Title row collapses as the list scrolls (height 44 → 0, opacity 1 → 0); a plain cut under Reduce Motion.
  const reduceMotion = useReducedMotion();
  const scrollY = useSharedValue(0);
  const titleStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      const hidden = scrollY.value > COLLAPSE_AT / 2;
      return { height: hidden ? 0 : TITLE_ROW, opacity: hidden ? 0 : 1 };
    }
    return {
      height: interpolate(scrollY.value, [0, COLLAPSE_AT], [TITLE_ROW, 0], Extrapolation.CLAMP),
      opacity: interpolate(scrollY.value, [0, COLLAPSE_AT], [1, 0], Extrapolation.CLAMP),
    };
  });
  // Home is a 2-page horizontal pager: Fridge list, then the overview. Always opens on the Fridge.
  const { width } = useWindowDimensions();
  const pagerRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  // Latest items for the ?open=newest dev link, without re-running the dev-param effect on every change.
  const allRef = useRef(all);
  useEffect(() => {
    allRef.current = all;
  }, [all]);
  // While a row is being swiped, the pager must not change pages.
  const [pagerEnabled, setPagerEnabled] = useState(true);
  const goToPage = useCallback(
    (i: number) => {
      pagerRef.current?.scrollTo({ x: i * width, animated: true });
      setPage(i);
    },
    [width],
  );
  const onPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page) setPage(i);
  };
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
    page: pageParam,
    picture: pictureParam,
    cook,
    open: openParam,
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
    page?: string;
    picture?: string;
    cook?: string;
    open?: string;
  }>();
  const [menuOpen, setMenuOpen] = useState<false | 'settings' | 'demo' | 'picture'>(false);

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
        if (cook) setManagerChip('cookTonight');
        setManagerOpen(true);
      }, 300);
    }
    if (openParam === 'newest') {
      setTimeout(() => {
        const newest = allRef.current[allRef.current.length - 1];
        if (newest) router.push({ pathname: '/item/[id]', params: { id: newest.id } });
      }, 300);
    }
    if (urgency) setTimeout(() => setUrgencyFilter(urgency as Urgency), 0);
    if (hintParam) hint.set(false);
    if (pageParam === 'overview') setTimeout(() => goToPage(1), 400);
    if (pictureParam) setTimeout(() => setMenuOpen('picture'), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    demo,
    menu,
    hintParam,
    big,
    manager,
    urgency,
    t,
    ask,
    pageParam,
    pictureParam,
    cook,
    openParam,
  ]);

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

  const removeItem = useCallback(
    (c: Character) => {
      const removed = remove(c.id);
      if (!removed) return;
      showToast(`Removed ${c.characterName}`, {
        label: 'Undo',
        onPress: () => restore(removed.item, removed.index),
        onExpire: () => deleteCrop(removed.item.photo),
      });
    },
    [remove, restore, showToast],
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
        <Animated.View style={[styles.titleRow, titleStyle]}>
          <Pressable
            accessibilityRole="header"
            accessibilityLabel={`${fridgeName}. FridgeMates`}
            accessibilityHint="Long press for settings"
            delayLongPress={500}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setMenuOpen('demo');
            }}
            style={styles.titlePress}
          >
            <AppText style={styles.title} numberOfLines={1}>
              {fridgeName}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Close search' : 'Search your fridge'}
            accessibilityState={{ selected: searchOpen }}
            onPress={toggleSearch}
            style={({ pressed }) => [
              styles.iconButton,
              searchOpen && styles.iconButtonOn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <UiIcon icon="magnifying-glass-tilted-left" size={20} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings and profile"
            onPress={() => setMenuOpen('settings')}
            hitSlop={6}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.85 }]}
          >
            <ProfilePicture size={32} />
          </Pressable>
        </Animated.View>
        <View style={styles.switchRow}>
          <Segmented
            options={['Fridge', 'Overview']}
            index={page}
            onChange={goToPage}
            width={width < 380 ? 188 : 196}
            accessibilityLabel="Fridge or Overview"
          />
          <View style={{ flex: 1 }} />
          <StatsLine
            data={scoreboard}
            rescuedBump={recentRescue?.count ?? 0}
            onPressLost={() => router.push('/memorial')}
          />
        </View>
        {demoMode && (
          <View style={styles.demoRow}>
            <Chip
              label={dayOffset ? `Skip ahead a day (+${dayOffset})` : 'Skip ahead a day'}
              tone="debug"
              onPress={skipDay}
            />
          </View>
        )}
        {page === 0 && rows.length > 0 && hint.ready && !hint.value && (
          <View style={styles.hint}>
            <UiIcon icon="light-bulb" size={20} />
            <AppText
              style={styles.hintText}
              numberOfLines={1}
              accessibilityLabel="Tip: the more worried they look, the sooner you should eat them."
            >
              Worried face = eat it sooner.
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss tip"
              onPress={() => hint.set(true)}
              style={({ pressed }) => [styles.hintClose, pressed && { opacity: 0.7 }]}
            >
              <CloseIcon size={16} color={colors.inkMuted} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        scrollEnabled={pagerEnabled}
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={onPagerEnd}
        scrollEventThrottle={32}
        style={styles.pager}
        contentContainerStyle={{ width: width * 2 }}
      >
        <View style={[styles.listArea, { width }]}>
          <FlatList
            ref={listRef}
            data={visibleRows}
            onScrollToIndexFailed={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
            onScrollBeginDrag={closeOpenRow}
            onScroll={(e) => scrollY.set(searchOpen ? 0 : e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
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
                onRemove={removeItem}
                onSwipeState={setPagerEnabled}
                isNew={recentlyAddedIds.includes(item.id)}
              />
            )}
            contentContainerStyle={[
              styles.list,
              {
                paddingTop: space.xs,
                paddingBottom: FOOTER_HEIGHT + insets.bottom,
              },
            ]}
            ListHeaderComponent={
              rows.length > 0 ? (
                <View style={styles.listHeader}>
                  <View style={styles.labelRow}>
                    <AppText
                      variant="sectionLabel"
                      color={colors.inkMuted}
                      accessibilityRole="header"
                      numberOfLines={1}
                    >
                      {urgencyFilter ? urgencyLabel[urgencyFilter] : sectionTitle(sortMode)} ·{' '}
                      {urgencyFilter || searchQuery.trim() ? visibleRows.length : scoreboard.inFridge}
                    </AppText>
                    {urgencyFilter && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Show everything"
                        onPress={() => setUrgencyFilter(null)}
                        style={({ pressed }) => [styles.labelClear, pressed && { opacity: 0.7 }]}
                      >
                        <CloseIcon size={14} color={colors.inkMuted} />
                      </Pressable>
                    )}
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
            nestedScrollEnabled
          />
        </View>
        <View style={{ width }}>
          <OverviewPanel
            onShowUrgency={(u) => {
              setUrgencyFilter(u);
              goToPage(0);
            }}
            bottomPadding={FOOTER_HEIGHT + insets.bottom}
          />
        </View>
      </ScrollView>

      <ManagerSheet
        visible={managerOpen}
        initialQuestion={managerQuestion}
        initialChip={managerChip}
        onClose={() => {
          setManagerOpen(false);
          setManagerQuestion(null);
          setManagerChip(null);
        }}
      />

      <SettingsSheet
        onTestSafety={() => {
          setManagerQuestion('this fridge is bullshit');
          setManagerOpen(true);
        }}
        visible={menuOpen !== false}
        demoFirst={menuOpen === 'demo'}
        pictureFirst={menuOpen === 'picture'}
        onClose={() => setMenuOpen(false)}
      />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,247,236,0)', colors.bg, colors.bg]}
        locations={[0, 0.4, 1]}
        style={[styles.fade, { height: FOOTER_HEIGHT + 16 + insets.bottom }]}
      />
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
              size={36}
              state={mascotState}
              expression={cheer ? 'excited' : mascotExpression}
              hideBubble
              accessibilityLabel=""
            />
            <AppText style={styles.askLabel}>Ask</AppText>
          </Pressable>
          <PrimaryButton
            icon={<UiIcon icon="camera" size={22} />}
            label="Scan your fridge"
            onPress={() => router.push('/scan')}
            style={styles.scan}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.xs, gap: 6, paddingBottom: space.sm },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, lineHeight: 30 },
  titlePress: { flex: 1, height: TITLE_ROW, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, overflow: 'hidden' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  iconButtonOn: { backgroundColor: colors.surfaceAlt },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listHeader: { gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 24, paddingBottom: 6 },
  labelClear: { width: 44, height: 44, marginVertical: -10, alignItems: 'center', justifyContent: 'center' },
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
    height: 44,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingLeft: space.md,
  },
  hintText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 18 },
  hintClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pager: { flex: 1 },
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
    paddingTop: space.sm,
    zIndex: 20,
  },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  scan: { flex: 1 },
  askLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, lineHeight: 20, paddingRight: 4 },
  mascotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    justifyContent: 'center',
    overflow: 'visible',
  },
  half: { flex: 1, paddingHorizontal: space.sm },
});
