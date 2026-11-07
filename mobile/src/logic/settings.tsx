import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setSoundsEnabled } from './sounds';

/**
 * App settings (persisted). TODO(ios-logic): shares AsyncStorage with the fridge store.
 */
export const AVATARS = ['🧑‍🍳', '🍕', '🥑', '🧊', '🐻'] as const;
export type Avatar = (typeof AVATARS)[number];

export interface Settings {
  voices: boolean;
  sounds: boolean;
  demoMode: boolean;
  /** Profile-lite: a fridge name and an emoji avatar, saved locally. */
  fridgeName: string;
  avatar: Avatar;
}

const KEY = 'fridgemates.settings.v1';
const defaults: Settings = {
  voices: true,
  sounds: true,
  demoMode: false,
  fridgeName: 'My fridge',
  avatar: '🧊',
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
        setSettings({ ...defaults, ...parsed });
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
