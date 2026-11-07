import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { Confetti } from '@/components/Confetti';
import { Face } from '@/components/Face';
import { Scoreboard } from '@/components/Scoreboard';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { useFridge, type Character } from '@/logic/store';
import { colors, moods, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Confetti />
      <View style={styles.body}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.hero}>
          <AppText style={styles.party}>🎉</AppText>
          <AppText variant="display" align="center">
            Rescued!
          </AppText>
          <AppText variant="body" color={colors.inkMuted} align="center">
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
              <Face emoji={c.emoji} mood="cocky" size={64} />
              <SpeechBubble
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
              <Face emoji={cameo.emoji} mood={cameo.mood} size={44} showBadge={false} />
              <SpeechBubble
                text={getCameoThanks(cameo.daysLeft)}
                style={styles.bubble}
              />
            </Animated.View>
          )}
        </View>

        <Animated.View entering={FadeInDown.delay(900)} style={styles.score}>
          <AppText variant="caption" color={colors.inkMuted} style={styles.label}>
            RESCUED
          </AppText>
          <AppText variant="countdown" color={colors.success}>
            +{rescued.length}
          </AppText>
          <Scoreboard data={scoreboard} rescuedBump={rescued.length} countUp />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton emoji="🧊" label="Back to the fridge" onPress={() => router.dismissAll()} />
      </View>
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
  body: { flex: 1, paddingHorizontal: space.lg, gap: space.xl, paddingTop: 28 },
  hero: { alignItems: 'center', gap: space.xs },
  party: { fontSize: 44, lineHeight: 52 },
  thanks: { gap: 14 },
  thankRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bubble: { flex: 1 },
  score: { alignItems: 'center', gap: space.xs },
  label: { letterSpacing: 1 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
});
