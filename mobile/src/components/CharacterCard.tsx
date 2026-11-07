import type { Character } from '@/logic/store';
import { colors, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppText } from './AppText';
import { Face } from './Face';
import { MoodPill } from './MoodPill';
import { useMoodMotion } from './useMoodMotion';

interface Props {
  character: Character;
  onPress?: (character: Character) => void;
}

/** Fridge list row. Dramatic items get the pulsing red border; the face carries the mood motion. */
export function CharacterCard({ character, onPress }: Props) {
  const m = moods[character.mood];
  const { borderStyle } = useMoodMotion(character.mood);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${character.characterName}, ${character.name}, ${m.label}`}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.(character);
      }}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.card, { opacity: m.opacity }, borderStyle]}>
        <View style={[styles.tintStripe, { backgroundColor: m.color }]} />
        <Face emoji={character.emoji} mood={character.mood} size={64} />
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={1}>
            {character.characterName}
          </AppText>
          <AppText variant="caption" color={colors.inkMuted} numberOfLines={1}>
            {character.name} · {character.personality}
          </AppText>
          <View style={styles.pillRow}>
            <MoodPill mood={character.mood} daysLeft={character.daysLeft} />
          </View>
        </View>
        <AppText variant="heading" color={colors.inkFaint}>
          ›
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: space.md },
  pressed: { transform: [{ scale: 0.985 }] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: space.lg,
    paddingLeft: space.lg + 6,
    overflow: 'hidden',
    ...shadow.card,
  },
  tintStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  text: { flex: 1, gap: 2 },
  pillRow: { marginTop: space.sm },
});
