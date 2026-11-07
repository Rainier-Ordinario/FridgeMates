import { mockScanResponse } from '@/api/mocks/scan';
import { useFirstRun } from '@/logic/firstRun';
import { useFridge } from '@/logic/store';
import { colors, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Extra rows (e.g. "Text me") injected by the screen. */
  extraRows?: Row[];
}

export interface Row {
  emoji: string;
  label: string;
  caption: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}

/** Demo tools sheet, opened by long-pressing the FridgeMates title. Works without camera or network. */
export function DemoMenu({ visible, onClose, extraRows = [] }: Props) {
  const { loadDemo, addScanned, skipDay, clearAll } = useFridge();
  const { resetWelcome } = useFirstRun();
  const insets = useSafeAreaInsets();

  const run = (fn: () => void) => () => {
    Haptics.selectionAsync();
    onClose();
    setTimeout(fn, 120);
  };

  const rows: Row[] = [
    {
      emoji: '🧊',
      label: 'Load demo fridge',
      caption: 'The full cast, one per mood, plus a ghost',
      onPress: run(loadDemo),
    },
    {
      emoji: '📷',
      label: 'Add a scan',
      caption: 'Three new characters, highlighted',
      onPress: run(() => addScanned(mockScanResponse.items)),
    },
    { emoji: '⏭', label: 'Skip a day', caption: 'Moods shift as the clock moves', onPress: run(skipDay) },
    ...extraRows,
    {
      emoji: '👋',
      label: 'Show welcome again',
      caption: 'First-run screen',
      onPress: run(() => {
        resetWelcome();
        router.push('/welcome');
      }),
    },
    {
      emoji: '🧹',
      label: 'Reset fridge',
      caption: 'Empty everything',
      onPress: run(clearAll),
      tone: 'danger',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close demo tools"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          exiting={SlideOutDown.duration(180)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
        >
          <View style={styles.grabber} />
          <AppText variant="heading" style={styles.title}>
            Demo tools
          </AppText>
          <AppText variant="caption" color={colors.inkMuted} style={styles.sub}>
            For the stage. Long-press the logo any time.
          </AppText>
          {rows.map((r) => (
            <Pressable
              key={r.label}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              accessibilityHint={r.caption}
              onPress={r.onPress}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowEmoji}>
                <AppText style={styles.rowEmojiText}>{r.emoji}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" color={r.tone === 'danger' ? colors.dangerStrong : colors.ink}>
                  {r.label}
                </AppText>
                <AppText variant="caption" color={colors.inkMuted}>
                  {r.caption}
                </AppText>
              </View>
            </Pressable>
          ))}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.sm,
    ...shadow.card,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    marginBottom: space.sm,
  },
  title: { textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  rowEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmojiText: { fontSize: 20, lineHeight: 26 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
