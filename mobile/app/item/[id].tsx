import { AppText } from '@/components/AppText';
import { PrimaryButton, RoundButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { MoodPill } from '@/components/MoodPill';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { dateSourceLabel, daysLeftLabel } from '@/logic/mood';
import { useFridge, type Character } from '@/logic/store';
import { colors, hit, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const sourceEmoji = { printed: '🏷️', estimated: '🔮', adjusted: '✍️' } as const;

/** Character detail: big face, countdown, date source, and the actions that change its fate. */
export default function CharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, eat, toss, openedToday, adjustDays } = useFridge();
  let c: Character | undefined;
  if (id) {
    c = getById(id);
  }

  if (!c) {
    return (
      <Screen padded edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.topBar}>
          <RoundButton emoji="←" label="Back" size={44} onPress={() => router.back()} />
        </View>
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

  function nudge(delta: number) {
    if (!c) return;
    Haptics.selectionAsync();
    adjustDays(c.id, delta);
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <RoundButton emoji="←" label="Back" size={44} onPress={() => router.back()} />
        <AppText variant="caption" color={colors.inkMuted}>
          {m.badge} {m.label.toUpperCase()}
        </AppText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeInDown.springify().damping(14)}
          style={[styles.hero, { backgroundColor: m.tint }]}
        >
          <Face emoji={c.emoji} mood={c.mood} size={160} />
          <AppText variant="display" align="center" style={{ opacity: m.opacity }}>
            {c.characterName}
          </AppText>
          <AppText variant="body" color={m.text} align="center">
            {c.name} · {c.personality}
          </AppText>
          <SpeechBubble
            text={`“${getSpeech(c, isGhost)}”`}
            tail="top"
            style={styles.bubble}
          />
        </Animated.View>

        <View style={styles.countdownCard}>
          <View style={styles.countdownRow}>
            <AppText variant="countdown" color={m.color}>
              {getCountdownValue(c.daysLeft, isGhost)}
            </AppText>
            <View style={{ flex: 1, gap: space.xs }}>
              <AppText variant="heading">{getCountdownLabel(c.daysLeft, isGhost)}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>
                {getCountdownDescription(c.expiresAt, c.daysLeft, isGhost)}
              </AppText>
            </View>
          </View>
          <View style={styles.sourceRow}>
            <View style={styles.sourceChip}>
              <AppText variant="caption" color={colors.inkMuted}>
                {sourceEmoji[c.dateSource]} {dateSourceLabel(c.dateSource)}
              </AppText>
            </View>
            {renderDateControl(c, gone, isGhost, nudge)}
          </View>
        </View>
      </ScrollView>

      {!gone && (
        <View style={styles.actions}>
          {!isGhost && (
            <>
              <PrimaryButton emoji="🎉" label="Ate it" tone="success" onPress={() => finish('eat')} />
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Haptics.selectionAsync();
                    openedToday(c.id);
                  }}
                  style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                >
                  <AppText variant="bodyBold" color={colors.brandText}>
                    📦 Opened today
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => finish('toss')}
                  style={({ pressed }) => [styles.secondary, styles.tossSecondary, pressed && styles.pressed]}
                >
                  <AppText variant="bodyBold" color={moods.dramatic.text}>
                    🗑️ Toss
                  </AppText>
                </Pressable>
              </View>
            </>
          )}
          {isGhost && (
            <PrimaryButton
              emoji="🪦"
              label="Toss and say goodbye"
              tone="danger"
              onPress={() => finish('toss')}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

function getSpeech(character: Character, isGhost: boolean): string {
  if (isGhost && character.epitaph) {
    return character.epitaph;
  }
  return character.intro;
}

function getCountdownValue(daysLeft: number, isGhost: boolean): string | number {
  if (isGhost) {
    return '👻';
  }
  return daysLeft;
}

function getCountdownLabel(daysLeft: number, isGhost: boolean): string {
  if (isGhost) {
    return 'Expired';
  }
  return daysLeftLabel(daysLeft);
}

function getCountdownDescription(expiresAt: string, daysLeft: number, isGhost: boolean): string {
  if (isGhost) {
    return 'Haunting the fridge until tossed.';
  }
  return `Use by ${expiresAt}. A "use soon" nudge, not a safety verdict.`;
}

function renderDateControl(
  character: Character,
  gone: boolean,
  isGhost: boolean,
  nudge: (delta: number) => void,
) {
  if (!gone && !isGhost) {
    return (
      <View style={styles.stepper}>
        <StepButton label="−" onPress={() => nudge(-1)} accessibilityLabel="One day less" />
        <AppText variant="caption" color={colors.inkMuted} style={styles.stepValue}>
          fix date
        </AppText>
        <StepButton label="+" onPress={() => nudge(1)} accessibilityLabel="One day more" />
      </View>
    );
  }
  return <MoodPill mood={character.mood} daysLeft={character.daysLeft} compact />;
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xl },
  hero: {
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.lg,
    padding: space.xl,
    paddingTop: space.xl,
  },
  bubble: { marginTop: space.md, alignSelf: 'stretch' },
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
  sourceChip: {
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
});
