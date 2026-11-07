import { AppText } from '@/components/AppText';
import { UiIcon } from '@/components/FoodIcon';
import { PrimaryButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { MoodPill } from '@/components/MoodPill';
import { DockedFooter } from '@/components/DockedFooter';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { dateSourceLabel, plainTimeLabel } from '@/logic/mood';
import { useNudge } from '@/components/NudgeBanner';
import { useFridge } from '@/logic/store';
import { colors, hit, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const moodIcon = {
  cocky: 'smiling-face-with-sunglasses',
  chill: 'relieved-face',
  nervous: 'grimacing-face',
  dramatic: 'face-screaming-in-fear',
  ghost: 'ghost',
} as const;

const sourceIcon = { printed: 'label', estimated: 'crystal-ball', adjusted: 'writing-hand' } as const;

/** Character detail: big face, countdown, date source, and the actions that change its fate. */
export default function CharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, eat, toss, openedToday, adjustDays, remove, restore } = useFridge();
  const { showToast } = useNudge();
  const c = id ? getById(id) : undefined;

  if (!c) {
    return (
      <Screen padded>
        <TopBar />
        <View style={styles.center}>
          <AppText variant="heading" align="center">
            That one already left the fridge.
          </AppText>
        </View>
      </Screen>
    );
  }

  const m = moods[c.mood];
  const isGhost = c.mood === 'ghost';
  const gone = c.status !== 'inFridge';

  function finish(kind: 'eat' | 'toss') {
    if (!c) return;
    if (kind === 'eat') {
      eat(c.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      toss(c.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    router.back();
  }

  function removeFromFridge() {
    if (!c) return;
    const removed = remove(c.id);
    if (!removed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast(`Removed ${c.characterName}`, {
      label: 'Undo',
      onPress: () => restore(removed.item, removed.index),
    });
    router.back();
  }

  function nudge(delta: number) {
    if (!c) return;
    Haptics.selectionAsync();
    adjustDays(c.id, delta);
  }

  return (
    <Screen>
      <TopBar
        right={
          <View style={styles.moodTag}>
            <UiIcon icon={moodIcon[c.mood]} size={16} />
            <AppText variant="caption" color={colors.inkMuted}>
              {m.label.toUpperCase()}
            </AppText>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeInDown.springify().damping(14)}
          style={[styles.hero, { backgroundColor: m.tint }]}
        >
          <Face
            food={c.name}
            emoji={c.emoji}
            mood={c.mood}
            size={160}
            label={`${c.characterName}, ${m.label}`}
          />
          <AppText variant="display" align="center" style={{ opacity: m.opacity }}>
            {c.characterName}
          </AppText>
          <AppText variant="body" color={m.text} align="center">
            {c.name} · {c.personality}
          </AppText>
        </Animated.View>

        <View style={styles.countdownCard}>
          <View style={styles.countdownRow}>
            <AppText variant="countdown" color={m.color}>
              {isGhost ? '👻' : c.daysLeft}
            </AppText>
            <View style={{ flex: 1, gap: space.xs }}>
              <AppText variant="heading">{plainTimeLabel(c.daysLeft)}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>
                {isGhost
                  ? 'Haunting the fridge until tossed.'
                  : `${c.daysLeft === 1 ? '1 day' : `${c.daysLeft} days`} left · use by ${c.expiresAt}. A nudge, not a safety verdict.`}
              </AppText>
            </View>
          </View>
          <View style={styles.sourceRow}>
            <View style={styles.sourceChip}>
              <UiIcon icon={sourceIcon[c.dateSource]} size={14} />
              <AppText variant="caption" color={colors.inkMuted}>
                {dateSourceLabel(c.dateSource)}
              </AppText>
            </View>
            {!gone && !isGhost ? (
              <View style={styles.stepper}>
                <StepButton label="−" onPress={() => nudge(-1)} accessibilityLabel="One day less" />
                <AppText variant="caption" color={colors.inkMuted} style={styles.stepValue}>
                  adjust
                </AppText>
                <StepButton label="+" onPress={() => nudge(1)} accessibilityLabel="One day more" />
              </View>
            ) : (
              <MoodPill mood={c.mood} compact />
            )}
          </View>
        </View>
      </ScrollView>

      {!gone && (
        <DockedFooter style={styles.actions}>
          {!isGhost && (
            <>
              <PrimaryButton
                icon={<UiIcon icon="party-popper" size={22} />}
                label="Ate it"
                tone="success"
                onPress={() => finish('eat')}
              />
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Opened today"
                  onPress={() => {
                    Haptics.selectionAsync();
                    openedToday(c.id);
                  }}
                  style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                >
                  <AppText variant="bodyBold" color={colors.brandText}>
                    Opened today
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toss it"
                  onPress={() => finish('toss')}
                  style={({ pressed }) => [styles.secondary, styles.tossSecondary, pressed && styles.pressed]}
                >
                  <AppText variant="bodyBold" color={moods.dramatic.text}>
                    Toss
                  </AppText>
                </Pressable>
              </View>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove from fridge"
            accessibilityHint="Deletes this item. Not a rescue, not a loss."
            onPress={removeFromFridge}
            style={({ pressed }) => [styles.removeLink, pressed && { opacity: 0.7 }]}
          >
            <AppText variant="caption" color={colors.inkMuted}>
              Remove from fridge
            </AppText>
          </Pressable>
          {isGhost && (
            <PrimaryButton
              icon={<UiIcon icon="headstone" size={22} />}
              label="Toss and say goodbye"
              tone="danger"
              onPress={() => finish('toss')}
            />
          )}
        </DockedFooter>
      )}
    </Screen>
  );
}

function StepButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.step, pressed && styles.pressed]}
    >
      <AppText variant="title" color={colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: space.xl, paddingVertical: space.lg, gap: space.lg },
  hero: {
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.lg,
    padding: space.xl,
    paddingTop: space.xl,
  },
  countdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  moodTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 1,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  step: {
    width: hit.min,
    height: hit.min,
    borderRadius: hit.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: '#FFD3B3',
  },
  stepValue: {
    minWidth: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: space.md,
  },
  actionRow: { flexDirection: 'row', gap: space.md },
  secondary: {
    flex: 1,
    minHeight: hit.min + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: '#FFD3B3',
  },
  tossSecondary: {
    backgroundColor: moods.dramatic.tint,
    borderColor: '#FFB8AE',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  removeLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});
