import type { FoodItem, ScanItem } from '@/api/types';
import { USE_MOCK } from '@/api/config';
import { mockFridgeItems } from '@/api/mocks/fridge';
import type { Mood } from '@/theme/moods';
import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { addDays, todayISO } from './dates';
import { daysLeftFor, moodFor, scanItemToFoodItem } from './mood';

/**
 * Fridge data store.
 *
 * TODO(ios-logic): owned by the data-model teammate. Currently in-memory and
 * seeded from mocks. Next steps for the owner:
 *   - persist `state` with @react-native-async-storage/async-storage
 *   - call api.ghost() when an item crosses into expired to fill `epitaph`
 * Keep the `useFridge()` return shape stable; every screen uses it.
 */

export interface Character extends FoodItem {
  daysLeft: number;
  mood: Mood;
}

export interface Scoreboard {
  inFridge: number;
  rescued: number;
  lost: number;
}

interface State {
  items: FoodItem[];
  /** Demo-only: days to skip ahead. */
  dayOffset: number;
}

type Action =
  | { type: 'addScanned'; scanned: ScanItem[] }
  | { type: 'eat'; id: string }
  | { type: 'toss'; id: string }
  | { type: 'openedToday'; id: string; shelfDaysOnceOpened?: number }
  | { type: 'adjustDays'; id: string; delta: number }
  | { type: 'setEpitaph'; id: string; epitaph: string }
  | { type: 'skipDay' }
  | { type: 'reset' };

function update(items: FoodItem[], id: string, patch: (i: FoodItem) => FoodItem) {
  return items.map((i) => (i.id === id ? patch(i) : i));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'addScanned':
      return {
        ...state,
        items: [...state.items, ...action.scanned.map((s) => scanItemToFoodItem(s, state.dayOffset))],
      };
    case 'eat':
      return {
        ...state,
        items: update(state.items, action.id, (i) => ({
          ...i,
          status: 'rescued',
          resolvedAt: todayISO(state.dayOffset),
        })),
      };
    case 'toss':
      return {
        ...state,
        items: update(state.items, action.id, (i) => ({
          ...i,
          status: 'lost',
          resolvedAt: todayISO(state.dayOffset),
        })),
      };
    case 'openedToday': {
      // Opening usually shortens life. Default: 3 days from today unless the printed date is sooner.
      const shelf = action.shelfDaysOnceOpened ?? 3;
      return {
        ...state,
        items: update(state.items, action.id, (i) => {
          const opened = addDays(todayISO(state.dayOffset), shelf);
          return { ...i, expiresAt: opened < i.expiresAt ? opened : i.expiresAt, dateSource: 'adjusted' };
        }),
      };
    }
    case 'adjustDays':
      return {
        ...state,
        items: update(state.items, action.id, (i) => ({
          ...i,
          expiresAt: addDays(i.expiresAt, action.delta),
          dateSource: 'adjusted',
        })),
      };
    case 'setEpitaph':
      return { ...state, items: update(state.items, action.id, (i) => ({ ...i, epitaph: action.epitaph })) };
    case 'skipDay':
      return { ...state, dayOffset: state.dayOffset + 1 };
    case 'reset':
      return initialState();
  }
}

function initialState(): State {
  return { items: USE_MOCK ? mockFridgeItems() : [], dayOffset: 0 };
}

interface FridgeContextValue {
  /** Every item (any status), enriched with daysLeft + mood for the current day offset. */
  all: Character[];
  /** In the fridge and not yet expired, sorted by fewest days left. */
  characters: Character[];
  /** In the fridge but expired: they haunt the Fridge screen until tossed. */
  ghosts: Character[];
  /** Eaten or tossed, newest first (memorial). */
  gone: Character[];
  scoreboard: Scoreboard;
  dayOffset: number;
  todayISO: string;
  getById: (id: string) => Character | undefined;
  addScanned: (scanned: ScanItem[]) => void;
  eat: (id: string) => void;
  toss: (id: string) => void;
  openedToday: (id: string) => void;
  adjustDays: (id: string, delta: number) => void;
  setEpitaph: (id: string, epitaph: string) => void;
  skipDay: () => void;
  reset: () => void;
}

const FridgeContext = createContext<FridgeContextValue | null>(null);

export function FridgeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const value = useMemo<FridgeContextValue>(() => {
    const all: Character[] = state.items.map((item) => {
      const daysLeft = daysLeftFor(item, state.dayOffset);
      return { ...item, daysLeft, mood: moodFor(daysLeft) };
    });
    const inFridge = all.filter((c) => c.status === 'inFridge');
    const characters = inFridge.filter((c) => c.mood !== 'ghost').sort((a, b) => a.daysLeft - b.daysLeft);
    const ghosts = inFridge.filter((c) => c.mood === 'ghost');
    const gone = all
      .filter((c) => c.status !== 'inFridge')
      .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));

    return {
      all,
      characters,
      ghosts,
      gone,
      scoreboard: {
        inFridge: characters.length,
        rescued: all.filter((c) => c.status === 'rescued').length,
        lost: all.filter((c) => c.status === 'lost').length,
      },
      dayOffset: state.dayOffset,
      todayISO: todayISO(state.dayOffset),
      getById: (id) => all.find((c) => c.id === id),
      addScanned: (scanned) => dispatch({ type: 'addScanned', scanned }),
      eat: (id) => dispatch({ type: 'eat', id }),
      toss: (id) => dispatch({ type: 'toss', id }),
      openedToday: (id) => dispatch({ type: 'openedToday', id }),
      adjustDays: (id, delta) => dispatch({ type: 'adjustDays', id, delta }),
      setEpitaph: (id, epitaph) => dispatch({ type: 'setEpitaph', id, epitaph }),
      skipDay: () => dispatch({ type: 'skipDay' }),
      reset: () => dispatch({ type: 'reset' }),
    };
  }, [state]);

  return <FridgeContext.Provider value={value}>{children}</FridgeContext.Provider>;
}

export function useFridge(): FridgeContextValue {
  const ctx = useContext(FridgeContext);
  if (!ctx) throw new Error('useFridge must be used inside <FridgeProvider>');
  return ctx;
}
