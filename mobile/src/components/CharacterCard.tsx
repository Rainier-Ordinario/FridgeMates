import type { Character } from '@/logic/store';
import { plainTimeLabel } from '@/logic/mood';
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
  /** One-tap "Ate it" (alive) from the list. */
  onAte?: (character: Character) => void;
  /** One-tap "Toss" (ghosts) from the list. */
  onToss?: (character: Character) => void;
  /** Freshly scanned: NEW tag + pop-in. */
  isNew?: boolean;
}

/**
 * Fridge list row. The card itself wears the mood: tinted background, ring border
 * (dramatic pulses red, ghosts are dashed), mood pill, plain-language time.
 */
function CharacterCardBase({ character, onPress, onAte, onToss, isNew = false }: Props) {
  const m = moods[character.mood];
  const isGhost = character.mood === 'ghost';
  const isDramatic = character.mood === 'dramatic';
  const { borderStyle } = useMoodMotion(character.mood);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${character.characterName}, ${character.name}, ${m.label}, ${plainTimeLabel(character.daysLeft)}`}
      accessibilityHint="Opens the character"
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.(character);
      }}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Animated.View
        entering={isNew ? ZoomIn.springify().damping(12) : undefined}
        style={[
          styles.card,
          { backgroundColor: m.tint, borderColor: m.color },
          isDramatic && styles.dramatic,
          isGhost && styles.ghost,
          !isDramatic && borderStyle,
          isDramatic && borderStyle,
        ]}
      >
        {isNew && (
          <View style={styles.newTag}>
            <AppText variant="captionBold" color={colors.ink}>
              NEW
            </AppText>
          </View>
        )}
        <Face emoji={character.emoji} mood={character.mood} size={64} fill={colors.surface} />
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={1}>
            {character.characterName}
          </AppText>
          <View style={styles.metaRow}>
            <MoodPill mood={character.mood} />
            <AppText style={styles.time} color={m.text} numberOfLines={1}>
              {plainTimeLabel(character.daysLeft)}
            </AppText>
          </View>
        </View>
        {isGhost ? (
          <ActionButton
            label="Toss"
            color={moods.ghost.text}
            onPress={() => onToss?.(character)}
            a11y={`Toss ${character.characterName}`}
          />
        ) : (
          <ActionButton
            label="Ate it"
            color={colors.ink}
            onPress={() => onAte?.(character)}
            a11y={`Ate it: ${character.characterName}`}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

function ActionButton({
  label,
  color,
  onPress,
  a11y,
}: {
  label: string;
  color: string;
  onPress: () => void;
  a11y: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => [styles.action, { borderColor: color }, pressed && styles.actionPressed]}
    >
      <AppText style={styles.actionText} color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Memoized: the Fridge list re-renders often (highlights, stats) and faces animate on their own. */
export const CharacterCard = React.memo(CharacterCardBase);

const styles = StyleSheet.create({
  pressable: { marginBottom: space.md },
  pressed: { transform: [{ scale: 0.985 }] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...shadow.card,
  },
  dramatic: { borderWidth: 3 },
  ghost: { borderStyle: 'dashed', borderColor: moods.ghost.color },
  newTag: {
    position: 'absolute',
    top: -1,
    right: space.lg,
    backgroundColor: colors.brand,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  text: { flex: 1, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20, flexShrink: 1 },
  action: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  actionText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, lineHeight: 20 },
});
