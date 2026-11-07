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
      intro: 'Oh, NOW you want me. Where was this energy at breakfast?',
    },
    {
      name: 'Strawberries',
      emoji: '🍓',
      characterName: 'The Berry Twins',
      personality: 'clingy, sweet, zero chill',
      daysLeft: 2,
      dateSource: 'estimated',
      intro: 'We go everywhere together. Including, soon, the bin, unless you act.',
    },
    {
      name: 'Eggs',
      emoji: '🥚',
      characterName: 'The Dozen',
      personality: 'calm, collective, slightly cult-like',
      daysLeft: 12,
      dateSource: 'printed',
      intro: 'We are twelve. We are patient. We are not going anywhere.',
    },
  ],
};
