import type { FoodItem } from '../types';
import { addDays, todayISO } from '@/logic/dates';

/**
 * Demo cast from docs/design-specs.md: one character per mood plus a ghost.
 * Dates are relative to the real calendar so the moods are right on any day.
 */
export function mockFridgeItems(): FoodItem[] {
  const today = todayISO(0);
  const mk = (
    id: string,
    daysLeft: number,
    item: Omit<FoodItem, 'id' | 'addedAt' | 'expiresAt' | 'status'>,
  ): FoodItem => ({
    id,
    ...item,
    addedAt: addDays(today, -3),
    expiresAt: addDays(today, daysLeft),
    status: 'inFridge',
  });

  return [
    mk('seed-avocado', 0, {
      name: 'Avocado',
      emoji: '🥑',
      characterName: 'Avo',
      personality: 'drama queen',
      dateSource: 'estimated',
      intro: 'Tonight or never. I mean it.',
    }),
    mk('seed-tomato', 1, {
      name: 'Tomato',
      emoji: '🍅',
      characterName: 'Big Tom',
      personality: 'anxious sweetheart',
      dateSource: 'estimated',
      intro: 'Is it hot in here, or just me?',
    }),
    mk('seed-mozz', 2, {
      name: 'Mozzarella',
      emoji: '🧀',
      characterName: 'Mozz',
      personality: 'smooth talker',
      dateSource: 'estimated',
      intro: 'Only in town for two days.',
    }),
    mk('seed-yogurt', 4, {
      name: 'Greek yogurt',
      emoji: '🥛',
      characterName: 'Sir Yogurtsworth',
      personality: 'posh and unbothered',
      dateSource: 'printed',
      intro: 'Oh good, the door. Hello.',
    }),
    mk('seed-ketchup', 30, {
      name: 'Ketchup',
      emoji: '🥫',
      characterName: 'Big Red',
      personality: 'smug, immortal energy',
      dateSource: 'printed',
      intro: "I've outlived three fridges.",
    }),
    {
      ...mk('seed-spinach', -2, {
        name: 'Spinach',
        emoji: '🥬',
        characterName: 'Leafy Lou',
        personality: 'anxious overachiever (deceased)',
        dateSource: 'estimated',
        intro: 'Still here. Take out the trash.',
      }),
      epitaph: 'Here lies Spinach. Bought with good intentions. Never opened.',
    },
  ];
}
