import type { Character } from '@/logic/store';
import { moods } from '@/theme';
import React from 'react';
import { FoodRow } from './FoodRow';

interface Props {
  character: Character;
  onPress?: (character: Character) => void;
  /** One-tap "Ate it" (alive) from the list. */
  onAte?: (character: Character) => void;
  /** One-tap "Toss" (ghosts) from the list. */
  onToss?: (character: Character) => void;
  /** Freshly scanned: NEW tag + pop-in. */
  isNew?: boolean;
  /** Swipe left to remove (wrong scan / thrown out). */
  onRemove?: (character: Character) => void;
  onSwipeState?: (dragging: boolean) => void;
}

/** Fridge list row: the compact FoodRow with Ate it / Toss. */
function CharacterCardBase({
  character,
  onPress,
  onAte,
  onToss,
  isNew = false,
  onRemove,
  onSwipeState,
}: Props) {
  const isGhost = character.mood === 'ghost';
  const action = isGhost
    ? onToss && {
        label: 'Toss',
        onPress: () => onToss(character),
        accessibilityLabel: `Toss ${character.characterName}`,
        color: moods.ghost.text,
      }
    : onAte && {
        label: 'Ate it',
        onPress: () => onAte(character),
        accessibilityLabel: `Ate it: ${character.characterName}`,
      };
  return (
    <FoodRow
      food={character.name}
      name={character.characterName}
      mood={character.mood}
      daysLeft={character.daysLeft}
      quantity={character.quantity}
      isNew={isNew}
      photo={character.photo}
      action={action || undefined}
      onPress={onPress ? () => onPress(character) : undefined}
      onRemove={onRemove ? () => onRemove(character) : undefined}
      onSwipeState={onSwipeState}
      accessibilityLabel={`${character.characterName}, ${character.name}${character.quantity > 1 ? `, ${character.quantity} of them` : ''}, ${moods[character.mood].label}`}
    />
  );
}

export const CharacterCard = React.memo(CharacterCardBase);
