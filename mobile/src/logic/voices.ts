import type { FoodItem } from '@/api/types';

/**
 * Per-character voice settings for expo-speech.
 *
 * TODO(ios-logic): owned by the voices teammate. Stub derives a stable pitch/rate
 * from the character name so every character sounds a little different.
 * Speech must only start after a user tap (see chat screen).
 */
export interface Voice {
  pitch: number; // 0.5 – 2.0
  rate: number; // 0.5 – 1.5
  language: string;
}

export function voiceFor(item: Pick<FoodItem, 'characterName'>): Voice {
  let hash = 0;
  for (const ch of item.characterName) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const pitch = 0.8 + (hash % 7) * 0.12; // 0.8 – 1.52
  const rate = 0.85 + ((hash >> 3) % 5) * 0.07; // 0.85 – 1.13
  return { pitch, rate, language: 'en-US' };
}
