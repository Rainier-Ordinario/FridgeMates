import type { Character } from '@/logic/store';
import { colors, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Face } from './Face';
import { MoodPill } from './MoodPill';
import { useMoodMotion } from './useMoodMotion';

interface Props {
  character: Character;
  onPress?: (character: Character) => void;
  /** One-tap "Ate it" from the list. */
  onAte?: (character: Character) => void;
  /** Freshly scanned: brand border, NEW tag, pop-in. */
  isNew?: boolean;
}

/** Fridge list row. Dramatic items get the pulsing red border; the face carries the mood motion. */
function CharacterCardBase({ character, onPress, onAte, isNew = false }: Props) {
  const m = moods[character.mood];
  const { borderStyle } = useMoodMotion(character.mood, isNew);

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
      <Animated.View
        entering={isNew ? ZoomIn.springify().damping(12) : undefined}
        style={[styles.card, { opacity: m.opacity }, borderStyle]}
      >
        <View style={[styles.tintStripe, { backgroundColor: m.color }]} />
        {isNew && (
          <View style={styles.newTag}>
            <AppText variant="caption" color={colors.ink}>
              NEW
            </AppText>
          </View>
        )}
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
        {onAte && character.mood !== 'ghost' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ate it: ${character.characterName}`}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onAte(character);
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.ate, pressed && styles.atePressed]}
          >
            <AppText variant="caption" color={colors.ink}>
              ✓ Ate it
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="heading" color={colors.inkFaint}>
            ›
          </AppText>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Memoized: the Fridge list re-renders often (highlights, stats) and faces animate on their own. */
export const CharacterCard = React.memo(CharacterCardBase);

const styles = StyleSheet.create({
  pressable: { marginBottom: space.md },
  ate: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: '#FFD3B3',
  },
  atePressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
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
  newTag: {
    position: 'absolute',
    top: 0,
    right: space.lg,
    backgroundColor: colors.brand,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  text: { flex: 1, gap: 2 },
  pillRow: { marginTop: space.sm },
});
