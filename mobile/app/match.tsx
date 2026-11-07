import { api } from '@/api/client';
import type { MatchResponse } from '@/api/types';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { PrimaryButton, RoundButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { MoodLoader } from '@/components/MoodLoader';
import { Screen } from '@/components/Screen';
import { useFridge, type Character } from '@/logic/store';
import { colors, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight, ZoomIn } from 'react-native-reanimated';

const loaderPhrases = [
  'checking who’s compatible…',
  'reading the room…',
  'swiping right on leftovers…',
  'lighting a candle…',
];

/** Matchmaking: a "date" card for the matched ingredients, then the recipe, then "I cooked it". */
export default function MatchScreen() {
  const { characters, getById, rescueMany } = useFridge();
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const findMatch = useCallback(async () => {
    setMatch(null);
    setError(null);
    try {
      const res = await api.match({ items: characters.map((c) => toChatItem(c, c.daysLeft)) });
      // If the backend names ids we don't have, pair the two most urgent so the screen still works.
      const known = res.rescues.filter((id) => characters.some((c) => c.id === id));
      let rescues = known;
      if (known.length < 1) {
        rescues = characters.slice(0, 2).map((c) => c.id);
      }
      setMatch({ ...res, rescues });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError('The matchmaker is offline. Try again in a moment.');
    }
  }, [characters]);

  // Deferred a tick so the effect itself doesn't set state synchronously.
  useEffect(() => {
    if (characters.length < 2) return;
    const id = setTimeout(() => findMatch(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const rescued: Character[] = (match?.rescues ?? [])
    .map((id) => getById(id))
    .filter((c): c is Character => !!c);
  const [a, b, ...others] = rescued;

  function cookedIt() {
    if (!match) return;
    const ids = rescued.map((c) => c.id);
    rescueMany(ids);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({
      pathname: '/rescue',
      params: {
        ids: ids.join(','),
        title: match.title,
        minutes: String(match.minutes),
        thankYou: match.thankYou,
      },
    });
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <RoundButton emoji="←" label="Back" size={48} onPress={() => router.back()} />
        <AppText variant="title">Matchmaker</AppText>
      </View>

      {characters.length < 2 && (
        <View style={styles.center}>
          <AppText style={styles.bigEmoji}>💔</AppText>
          <AppText variant="heading" align="center">
            It takes two to date.
          </AppText>
          <AppText variant="body" color={colors.inkMuted} align="center">
            Scan a couple more things and come back.
          </AppText>
        </View>
      )}

      {characters.length >= 2 && !match && (
        <View style={styles.center}>
          {error && (
            <>
              <AppText variant="heading" align="center">
                {error}
              </AppText>
              <PrimaryButton label="Try again" onPress={() => setAttempt((n) => n + 1)} />
            </>
          )}
          {!error && <MoodLoader phrases={loaderPhrases} sub="finding the best pairing in your fridge" />}
        </View>
      )}

      {characters.length >= 2 && match && (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Animated.View entering={ZoomIn.springify().damping(13)} style={styles.card}>
              <AppText style={styles.kicker} color={colors.brandDark} align="center">
                It’s a match!
              </AppText>
              <View style={styles.faces}>
                {a && (
                  <Animated.View entering={SlideInLeft.springify().damping(14)}>
                    <Face emoji={a.emoji} mood="nervous" size={96} />
                  </Animated.View>
                )}
                <AppText style={styles.heart}>❤️</AppText>
                {b && (
                  <Animated.View entering={SlideInRight.springify().damping(14)}>
                    <Face emoji={b.emoji} mood="nervous" size={96} />
                  </Animated.View>
                )}
              </View>
              <AppText variant="title" align="center">
                {a?.characterName}
                {b && (
                  <>
                    <AppText variant="title" color={colors.brandDark}>
                      {' '}
                      &amp;{' '}
                    </AppText>
                    {b.characterName}
                  </>
                )}
              </AppText>
              {others.length > 0 && (
                <View style={styles.thirdWheel}>
                  <Face emoji={others[0].emoji} mood="cocky" size={32} showBadge={false} animated={false} />
                  <AppText variant="caption" color={colors.inkMuted}>
                    + {others.map((o) => o.characterName).join(', ')}, third wheel
                  </AppText>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeIn.delay(350)} style={styles.recipe}>
              <View style={styles.recipeHead}>
                <AppText variant="heading" style={styles.recipeTitle}>
                  {match.title}
                </AppText>
                <View style={styles.minChip}>
                  <AppText variant="caption">⏱ {match.minutes} min</AppText>
                </View>
              </View>
              {match.steps.map((step, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}>
                    <AppText variant="caption" color={colors.ink}>
                      {i + 1}
                    </AppText>
                  </View>
                  <AppText variant="body" style={styles.stepText}>
                    {step}
                  </AppText>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  Haptics.selectionAsync();
                  setAttempt((n) => n + 1);
                }}
                style={({ pressed }) => [styles.skip, pressed && { opacity: 0.7 }]}
              >
                <AppText variant="caption" color={colors.inkMuted}>
                  Not tonight → next match
                </AppText>
              </Pressable>
            </Animated.View>
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton emoji="🍳" label="I cooked it" onPress={cookedIt} style={styles.bigButton} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  bigEmoji: { fontSize: 64, lineHeight: 76 },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    gap: space.sm,
    alignItems: 'center',
    ...shadow.card,
  },
  kicker: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  faces: { flexDirection: 'row', alignItems: 'center', marginVertical: space.xs },
  heart: { fontSize: 34, lineHeight: 40, marginHorizontal: -8, zIndex: 2 },
  thirdWheel: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  recipe: { gap: space.sm },
  recipeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  recipeTitle: { fontSize: 20, lineHeight: 26, flex: 1 },
  minChip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, fontSize: 15, lineHeight: 20 },
  skip: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: space.sm },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  bigButton: { minHeight: 64 },
});
