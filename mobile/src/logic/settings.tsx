import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setSoundsEnabled } from './sounds';

/**
 * App settings (persisted). TODO(ios-logic): shares AsyncStorage with the fridge store.
 */
/** Preset profile pictures: Fluent food icons on mood circles, plus the fridge manager mascot. */
export const AVATAR_PRESETS = [
  { key: 'avocado', icon: 'avocado', mood: 'cocky', label: 'Avocado' },
  { key: 'tomato', icon: 'tomato', mood: 'dramatic', label: 'Tomato' },
  { key: 'cheese', icon: 'cheese-wedge', mood: 'nervous', label: 'Cheese' },
  { key: 'milk', icon: 'glass-of-milk', mood: 'chill', label: 'Milk' },
  { key: 'pizza', icon: 'pizza', mood: 'nervous', label: 'Pizza' },
  { key: 'ice', icon: 'ice', mood: 'chill', label: 'Ice' },
  { key: 'cook', icon: 'cook', mood: 'cocky', label: 'Chef' },
  { key: 'bear', icon: 'bear', mood: 'ghost', label: 'Bear' },
  { key: 'mascot', icon: null, mood: 'chill', label: 'Fridge manager' },
] as const;
export type Avatar = (typeof AVATAR_PRESETS)[number]['key'];

/** Older builds stored an emoji; map it to a preset key. */
export function migrateAvatar(value: unknown): Avatar {
  const map: Record<string, Avatar> = {
    '🧑‍🍳': 'cook',
    '🍕': 'pizza',
    '🥑': 'avocado',
    '🧊': 'ice',
    '🐻': 'bear',
  };
  if (typeof value === 'string') {
    if (AVATAR_PRESETS.some((p) => p.key === value)) return value as Avatar;
    if (map[value]) return map[value];
  }
  return 'ice';
}

export interface Settings {
  sounds: boolean;
  demoMode: boolean;
  /** Profile-lite: a fridge name, a preset picture, and an optional custom photo (file in the app's documents). */
  fridgeName: string;
  avatar: Avatar;
  avatarPhoto: string | null;
  /** Local 'your food texts you' notifications (on by default once permission is granted). */
  notifications: boolean;
  /** Whether we already asked for notification permission (asked after the first scan, not on launch). */
  notificationsAsked: boolean;
}

const KEY = 'fridgemates.settings.v1';
const defaults: Settings = {
  sounds: true,
  demoMode: false,
  fridgeName: 'My fridge',
  avatar: 'ice',
  avatarPhoto: null,
  notifications: false,
  notificationsAsked: false,
};

interface Value extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<Value | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const hydrated = useRef(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({ ...defaults, ...parsed, avatar: migrateAvatar(parsed.avatar) });
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setSoundsEnabled(settings.sounds);
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const value = useMemo<Value>(() => ({ ...settings, set }), [settings, set]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Value {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
