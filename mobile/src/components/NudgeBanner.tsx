import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
import { useFridge } from '@/logic/store';
import { colors, radius, shadow, space, type Mood, motion } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInUp,
  SlideOutUp,
  useReducedMotion,
} from 'react-native-reanimated';
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

export interface ToastAction {
  label: string;
  onPress: () => void;
  /** Default 2600 ms, or 5000 ms when an action is present. */
  durationMs?: number;
  /** Runs when the toast goes away without the action being used (timer ran out, or another toast replaced it). */
  onExpire?: () => void;
}

export interface ToastState {
  key: number;
  text: string;
  action?: ToastAction;
}

/**
 * Toast state + timer. The provider uses it for every screen; a modal screen (Scan) keeps its own copy,
 * because the provider's toast would render underneath the native modal.
 */
export function useToastState() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expire = useRef<(() => void) | null>(null);
  const seq = useRef(0);

  const dismissToast = useCallback((reason: 'action' | 'expire') => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const onExpire = expire.current;
    expire.current = null;
    setToast(null);
    if (reason === 'expire') onExpire?.();
  }, []);

  const showToast = useCallback(
    (text: string, action?: ToastAction) => {
      if (timer.current) clearTimeout(timer.current);
      // A toast that gets replaced counts as expired: its Undo is gone.
      expire.current?.();
      expire.current = action?.onExpire ?? null;
      seq.current += 1;
      setToast({ key: seq.current, text, action });
      timer.current = setTimeout(() => dismissToast('expire'), action?.durationMs ?? (action ? 5000 : 2600));
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { toast, showToast, dismissToast };
}

interface NudgeContextValue {
  showNudge: (n: Nudge) => void;
  dismiss: () => void;
  /** Small bottom toast, auto-dismisses; optional action button (e.g. Undo). */
  showToast: (text: string, action?: ToastAction) => void;
}

const NudgeContext = createContext<NudgeContextValue | null>(null);

/** Shows "your food texted you" banners over every screen. Mount once in the root layout. */
export function NudgeProvider({ children }: { children: React.ReactNode }) {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const { toast, showToast, dismissToast } = useToastState();
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

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ showNudge, dismiss, showToast }), [showNudge, dismiss, showToast]);

  return (
    <NudgeContext.Provider value={value}>
      {children}
      {nudge && <Banner nudge={nudge} onDismiss={dismiss} />}
      {toast && (
        <Toast
          key={toast.key}
          text={toast.text}
          action={toast.action}
          onDone={() => dismissToast('action')}
        />
      )}
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

/** Small bottom pill; `offset` is the space kept clear above the safe area (the docked footer). */
export function Toast({
  text,
  action,
  onDone,
  offset = 120,
}: {
  text: string;
  action?: ToastAction;
  onDone: () => void;
  offset?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.toastWrap, { bottom: Math.max(insets.bottom, 24) + offset }]}
      pointerEvents={action ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.toast}>
        <AppText variant="caption" color={colors.surface} align="center" style={{ flexShrink: 1 }}>
          {text}
        </AppText>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              action.onPress();
              onDone();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.toastAction, pressed && { opacity: 0.8 }]}
          >
            <AppText variant="captionBold" color={colors.brand}>
              {action.label}
            </AppText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function Banner({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion ? FadeIn.duration(motion.fast) : SlideInUp.springify().damping(16);
  const exiting = reduceMotion ? FadeOut.duration(motion.fast) : SlideOutUp.duration(motion.fast);
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
        <Face food={nudge.name} emoji={nudge.emoji} mood={nudge.mood} size={40} showBadge={false} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {nudge.name}
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
  toastWrap: { position: 'absolute', left: space.xl, right: space.xl, alignItems: 'center', zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    maxWidth: 340,
  },
  toastAction: { minHeight: 32, justifyContent: 'center', paddingHorizontal: space.xs },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.92 },
});
