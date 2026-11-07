import type { FoodItem } from '../types';
import { addDays, todayISO } from '@/logic/dates';

/**
 * Demo fridge: one character per mood, plus a mozzarella to set up matchmaking.
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
    addedAt: addDays(today, -2),
    expiresAt: addDays(today, daysLeft),
    status: 'inFridge',
  });

  return [
    mk('seed-ketchup', 14, {
      name: 'Ketchup',
      emoji: '🥫',
      characterName: 'Big Red',
      personality: 'smug, immortal energy',
      dateSource: 'printed',
      intro: "Relax. I'll outlive all of you.",
    }),
    mk('seed-yogurt', 4, {
      name: 'Greek yogurt',
      emoji: '🥛',
      characterName: 'Sir Yogurtsworth',
      personality: 'dramatic, needy',
      dateSource: 'printed',
      intro: 'Finally, someone opened the door.',
    }),
    mk('seed-mozz', 2, {
      name: 'Mozzarella',
      emoji: '🧀',
      characterName: 'Mozz',
      personality: 'soft-spoken romantic',
      dateSource: 'estimated',
      intro: "I don't want to be dramatic, but is Tomato single?",
    }),
    mk('seed-tomato', 1, {
      name: 'Tomato',
      emoji: '🍅',
      characterName: 'Big Tom',
      personality: 'nervous wreck, secretly sweet',
      dateSource: 'estimated',
      intro: 'Oh thank goodness. Is it dinner? Please say dinner.',
    }),
    mk('seed-avocado', 0, {
      name: 'Avocado',
      emoji: '🥑',
      characterName: 'Avo',
      personality: 'theatrical, running out of time',
      dateSource: 'estimated',
      intro: 'TODAY. It is TODAY. Do you understand what that means?!',
    }),
    {
      ...mk('seed-spinach', -2, {
        name: 'Spinach',
        emoji: '🥬',
        characterName: 'Leafy Lou',
        personality: 'anxious overachiever (deceased)',
        dateSource: 'estimated',
        intro: 'Hi! Quick question: when were you planning to eat me?',
      }),
      epitaph: 'Here lies Spinach. Bought with good intentions.',
    },
  ];
}
