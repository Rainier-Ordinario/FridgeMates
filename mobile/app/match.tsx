import { api, ApiError, apiErrorKind } from '@/api/client';
import type { MatchResponse } from '@/api/types';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { UiIcon } from '@/components/FoodIcon';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { MoodLoader } from '@/components/MoodLoader';
import { DockedFooter, FOOTER_SECONDARY_WIDTH, FooterRow } from '@/components/DockedFooter';
import { RecoveryCard, type RecoveryKind } from '@/components/RecoveryCard';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { useFridge, type Character } from '@/logic/store';
import { colors, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
  const [error, setError] = useState<RecoveryKind | null>(null);
  const [attempt, setAttempt] = useState(0);

  const findMatch = useCallback(async () => {
    setMatch(null);
    setError(null);
    try {
      const res = await api.match({ items: characters.map((c) => toChatItem(c, c.daysLeft)) });
      // The card, the steps and the rescued items must agree: use only ids we actually have.
      const known = res.rescues.filter((id) => characters.some((c) => c.id === id));
      if (known.length < 2)
        throw new ApiError('bad-response', 'match named items that are not in this fridge');
      setMatch({ ...res, rescues: known });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(apiErrorKind(err));
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
    <Screen>
      <TopBar title="Date night" />

      {characters.length < 2 ? (
        <View style={styles.center}>
          <RecoveryCard kind="few" closeAfterDemo={false} />
        </View>
      ) : !match ? (
        <View style={styles.center}>
          {error ? (
            <RecoveryCard kind={error} onRetry={() => setAttempt((n) => n + 1)} closeAfterDemo={false} />
          ) : (
            <MoodLoader phrases={loaderPhrases} sub="finding the best pairing in your fridge" />
          )}
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Animated.View entering={ZoomIn.springify().damping(13)} style={styles.card}>
              <View style={styles.faces}>
                {a && (
                  <Animated.View entering={SlideInLeft.springify().damping(14)}>
                    <Face food={a.name} mood={a.mood} size={64} label={a.characterName} />
                  </Animated.View>
                )}
                <View style={styles.heart}>
                  <UiIcon icon="red-heart" size={24} />
                </View>
                {b && (
                  <Animated.View entering={SlideInRight.springify().damping(14)}>
                    <Face food={b.name} mood={b.mood} size={64} label={b.characterName} />
                  </Animated.View>
                )}
              </View>
              <View style={styles.cardText}>
                <AppText style={styles.matchTitle} numberOfLines={1}>
                  It’s a match!
                </AppText>
                <AppText style={styles.names} numberOfLines={1}>
                  {a?.characterName} × {b?.characterName}
                </AppText>
                {others.length > 0 && (
                  <AppText style={styles.thirdWheel} color={colors.inkMuted} numberOfLines={1}>
                    + {others.map((o) => o.characterName).join(', ')}, third wheel
                  </AppText>
                )}
              </View>
            </Animated.View>

            <View style={styles.need}>
              <AppText variant="sectionLabel" color={colors.inkMuted} accessibilityRole="header">
                You’ll need
              </AppText>
              <View style={styles.chips}>
                {rescued.map((c) => (
                  <View
                    key={c.id}
                    style={styles.chip}
                    accessible
                    accessibilityLabel={`${c.characterName}, ${c.name}`}
                  >
                    <Face
                      food={c.name}
                      mood={c.mood}
                      size={22}
                      showBadge={false}
                      animated={false}
                      expression={false}
                    />
                    <AppText style={styles.chipText} numberOfLines={1}>
                      {c.name}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            <Animated.View entering={FadeIn.delay(350)} style={styles.recipe}>
              <View style={styles.recipeHead}>
                <AppText variant="screenTitle" style={styles.recipeTitle}>
                  {match.title}
                </AppText>
                <View style={styles.minChip}>
                  <UiIcon icon="alarm-clock" size={14} />
                  <AppText variant="caption">{match.minutes} min</AppText>
                </View>
              </View>
              {match.steps.map((step, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}>
                    <AppText style={styles.stepNumText}>{i + 1}</AppText>
                  </View>
                  <AppText style={styles.stepText}>{step}</AppText>
                </View>
              ))}
            </Animated.View>
          </ScrollView>
          <DockedFooter>
            <FooterRow>
              <SecondaryButton
                label="Another idea"
                accessibilityLabel="Another idea: find a different match"
                outlined
                tall
                onPress={() => setAttempt((n) => n + 1)}
                style={{ width: FOOTER_SECONDARY_WIDTH }}
              />
              <PrimaryButton
                icon={<UiIcon icon="cooking" size={22} />}
                label="I cooked it"
                onPress={cookedIt}
                style={{ flex: 1 }}
              />
            </FooterRow>
          </DockedFooter>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  scroll: { paddingHorizontal: space.xl, paddingVertical: space.md, gap: space.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 88,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadow.card,
  },
  faces: { flexDirection: 'row', alignItems: 'center' },
  heart: { marginHorizontal: -8, zIndex: 2 },
  cardText: { flex: 1, minWidth: 0 },
  matchTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, lineHeight: 28 },
  names: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20 },
  thirdWheel: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 18 },
  need: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipText: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18 },
  recipe: { gap: 6 },
  recipeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  recipeTitle: { flex: 1 },
  minChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, lineHeight: 18 },
  stepText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 20 },
});
