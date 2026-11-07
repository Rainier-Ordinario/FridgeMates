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
  onQuantityChange?: (character: Character, quantity: number) => void;
  /** Freshly scanned: NEW tag + pop-in. */
  isNew?: boolean;
}

/** Fridge list row: the compact FoodRow with Ate it / Toss. */
function CharacterCardBase({ character, onPress, onAte, onToss, onQuantityChange, isNew = false }: Props) {
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
      onQuantityChange={onQuantityChange ? (quantity) => onQuantityChange(character, quantity) : undefined}
      isNew={isNew}
      action={action || undefined}
      onPress={onPress ? () => onPress(character) : undefined}
      accessibilityLabel={`${character.characterName}, ${character.name}, ${moods[character.mood].label}`}
    />
  );
}

export const CharacterCard = React.memo(CharacterCardBase);
