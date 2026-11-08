import { AppText } from '@/components/AppText';
import { UiIcon } from '@/components/FoodIcon';
import { PrimaryButton } from '@/components/Buttons';
import { Confetti } from '@/components/Confetti';
import { DockedFooter } from '@/components/DockedFooter';
import { Face } from '@/components/Face';
import { Mascot } from '@/components/Mascot';
import { Scoreboard } from '@/components/Scoreboard';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { estimatePrice, formatDollars } from '@/logic/prices';
import { useFridge, type Character } from '@/logic/store';
import { colors, moods, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

const extraThanks = [
  'Best date of my life. Also my last.',
  'Finally. Someone with taste.',
  'Tell the others I made it out.',
];

/** Rescue celebration after "I cooked it": confetti, thank-yous, +N, scoreboard ticks up. */
export default function RescueScreen() {
  const {
    ids = '',
    title = '',
    minutes = '',
    thankYou = '',
  } = useLocalSearchParams<{
    ids?: string;
    title?: string;
    minutes?: string;
    thankYou?: string;
  }>();
  const { getById, characters, scoreboard } = useFridge();
  const rescued = ids
    .split(',')
    .map((id) => getById(id))
    .filter((c): c is Character => !!c);
  const cameo = characters[0];
  const saved = rescued.reduce((sum, c) => sum + estimatePrice(c.name), 0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <Screen>
      <Confetti />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.hero}>
          <Mascot
            size={80}
            state="celebrate"
            hideBubble
            accessibilityLabel="The fridge manager, celebrating"
          />
          <AppText style={styles.title} align="center">
            Rescued!
          </AppText>
          <AppText style={styles.subtitle} color={colors.inkMuted} align="center">
            {title}
            {getMinutesLabel(minutes)}
          </AppText>
        </Animated.View>

        <View style={styles.thanks}>
          {rescued.map((c, i) => (
            <Animated.View
              key={c.id}
              entering={FadeInDown.delay(300 + i * 220)
                .springify()
                .damping(14)}
              style={styles.thankRow}
            >
              <Face food={c.name} mood="cocky" size={48} label={`${c.characterName}, rescued`} />
              <SpeechBubble
                compact
                text={getThanks(i, thankYou)}
                tint={moods.cocky.tint}
                style={styles.bubble}
              />
            </Animated.View>
          ))}
          {cameo && (
            <Animated.View
              entering={FadeInDown.delay(300 + rescued.length * 220 + 200)
                .springify()
                .damping(14)}
              style={styles.thankRow}
            >
              <Face
                food={cameo.name}
                mood={cameo.mood}
                size={40}
                showBadge={false}
                label={cameo.characterName}
              />
              <SpeechBubble compact text={getCameoThanks(cameo.daysLeft)} style={styles.bubble} />
            </Animated.View>
          )}
        </View>

        <Animated.View entering={FadeInDown.delay(900)} style={styles.score}>
          <View
            style={styles.scoreCard}
            accessible
            accessibilityLabel={`${rescued.length} rescued${saved > 0 ? `, you saved about ${formatDollars(saved)}` : ''}`}
          >
            <AppText style={styles.plus} color={colors.successText}>
              +{rescued.length}
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.scoreWord} color={colors.successText}>
                rescued
              </AppText>
              {saved > 0 && (
                <AppText variant="caption" color={colors.inkMuted}>
                  You saved about {formatDollars(saved)}
                </AppText>
              )}
            </View>
          </View>
          <Scoreboard data={scoreboard} rescuedBump={rescued.length} countUp />
        </Animated.View>
      </ScrollView>

      <DockedFooter>
        <PrimaryButton
          icon={<UiIcon icon="ice" size={22} />}
          label="Back to the fridge"
          onPress={() => router.dismissAll()}
        />
      </DockedFooter>
    </Screen>
  );
}

function getMinutesLabel(minutes: string): string {
  if (!minutes) {
    return '';
  }
  return ` · ${minutes} min`;
}

function getThanks(index: number, thankYou: string): string {
  if (index === 0 && thankYou) {
    return thankYou;
  }
  return extraThanks[index % extraThanks.length];
}

function getCameoThanks(daysLeft: number): string {
  if (daysLeft <= 1) {
    return 'Um, hello? Still here. Tonight. Me.';
  }
  return 'Cute. Anyway, I’m next, right?';
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, gap: space.lg, paddingTop: space.md, paddingBottom: space.md },
  hero: { alignItems: 'center', gap: space.xs },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, lineHeight: 36 },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 20 },
  thanks: { gap: space.sm },
  thankRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubble: { flex: 1 },
  score: { gap: space.sm },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  plus: { fontFamily: 'Nunito_800ExtraBold', fontSize: 40, lineHeight: 44, fontVariant: ['tabular-nums'] },
  scoreWord: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, lineHeight: 20 },
});
