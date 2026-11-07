import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
import { useFridge } from '@/logic/store';
import { colors, radius, shadow, space, type Mood } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Face } from './Face';

export interface Nudge {
  id: string;
  emoji: string;
  mood: Mood;
  name: string;
  text: string;
}

interface NudgeContextValue {
  showNudge: (n: Nudge) => void;
  dismiss: () => void;
}

const NudgeContext = createContext<NudgeContextValue | null>(null);

/** Shows "your food texted you" banners over every screen. Mount once in the root layout. */
export function NudgeProvider({ children }: { children: React.ReactNode }) {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setNudge(null);
  }, []);

  const showNudge = useCallback(
    (n: Nudge) => {
      if (timer.current) clearTimeout(timer.current);
      setNudge(n);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      timer.current = setTimeout(dismiss, 4500);
    },
    [dismiss],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const value = useMemo(() => ({ showNudge, dismiss }), [showNudge, dismiss]);

  return (
    <NudgeContext.Provider value={value}>
      {children}
      {nudge && <Banner nudge={nudge} onDismiss={dismiss} />}
    </NudgeContext.Provider>
  );
}

export function useNudge(): NudgeContextValue {
  const ctx = useContext(NudgeContext);
  if (!ctx) throw new Error('useNudge must be used inside <NudgeProvider>');
  return ctx;
}

/** "Text me": asks /messages for the most urgent character's line, with an in-character fallback. */
export function useTextMe() {
  const { characters } = useFridge();
  const { showNudge } = useNudge();
  return useCallback(async () => {
    const star = characters[0];
    if (!star) return;
    let text: string | undefined;
    let who = star;
    try {
      const res = await api.messages({ items: characters.map((c) => toChatItem(c, c.daysLeft)) });
      const first = res.messages.find((m) => characters.some((c) => c.id === m.id));
      if (first) {
        text = first.text;
        who = characters.find((c) => c.id === first.id) ?? star;
      }
    } catch {
      // backend offline or endpoint missing: fall through to the fallback line
    }
    if (!text) text = who.daysLeft <= 0 ? "it's today. it's literally today." : "u up? it's about tomorrow";
    showNudge({ id: who.id, emoji: who.emoji, mood: who.mood, name: who.name, text });
  }, [characters, showNudge]);
}

function Banner({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion ? FadeIn.duration(200) : SlideInUp.springify().damping(16);
  const exiting = reduceMotion ? FadeOut.duration(150) : SlideOutUp.duration(220);
  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      style={[styles.wrap, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${nudge.name} texted you: ${nudge.text}. Opens ${nudge.name}.`}
        onPress={() => {
          onDismiss();
          router.push({ pathname: '/item/[id]', params: { id: nudge.id } });
        }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Face emoji={nudge.emoji} mood={nudge.mood} size={40} showBadge={false} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {nudge.name} {nudge.emoji}
          </AppText>
          <AppText variant="body" numberOfLines={2}>
            {nudge.text}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          hitSlop={8}
          style={styles.close}
        >
          <AppText variant="heading" color={colors.inkMuted}>
            ✕
          </AppText>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingLeft: space.md,
    paddingRight: space.sm,
    ...shadow.card,
  },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.92 },
});
