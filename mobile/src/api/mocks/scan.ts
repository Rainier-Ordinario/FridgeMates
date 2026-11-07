import type { ScanResponse } from '../types';

/** What /scan returns for a photo of a yogurt tub and a bag of spinach. */
export const mockScanResponse: ScanResponse = {
  items: [
    {
      name: 'Greek yogurt',
      emoji: '🥛',
      characterName: 'Sir Yogurtsworth',
      personality: 'dramatic, needy',
      daysLeft: 4,
      dateSource: 'printed',
      intro: 'Finally, someone opened the door.',
    },
    {
      name: 'Spinach',
      emoji: '🥬',
      characterName: 'Leafy Lou',
      personality: 'anxious overachiever',
      daysLeft: 3,
      dateSource: 'estimated',
      intro: 'Hi! Quick question: when were you planning to eat me? Asking for a friend. The friend is me.',
    },
  ],
};
