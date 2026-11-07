import type { ScanResponse } from '../types';

/** What /scan returns for a photo of a grocery haul: milk, strawberries, eggs. */
export const mockScanResponse: ScanResponse = {
  items: [
    {
      name: 'Milk',
      emoji: '🥛',
      characterName: 'Moo-dy Judy',
      personality: 'passive-aggressive, lactose-proud',
      daysLeft: 5,
      dateSource: 'printed',
      intro: 'Took you long enough.',
    },
    {
      name: 'Strawberries',
      emoji: '🍓',
      characterName: 'The Berry Twins',
      personality: 'clingy, sweet, zero chill',
      daysLeft: 2,
      dateSource: 'estimated',
      intro: 'We go everywhere. Even the bin?',
    },
    {
      name: 'Eggs',
      emoji: '🥚',
      characterName: 'The Dozen',
      personality: 'calm, collective, slightly cult-like',
      daysLeft: 12,
      dateSource: 'printed',
      intro: 'Twelve of us. Not worried.',
    },
  ],
};
