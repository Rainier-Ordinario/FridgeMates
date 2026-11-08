/**
 * Mood system. The look of each character is driven entirely by its mood,
 * which the expiry engine (src/logic/mood.ts) derives from days left.
 *
 *  6+ days  cocky     green, relaxed breathe
 *  3–5      chill     blue, gentle bob
 *  1–2      nervous   amber, wobble
 *  0        dramatic  coral, shake + pulsing red border
 *  expired  ghost     gray, translucent, floating
 */
export type Mood = 'cocky' | 'chill' | 'nervous' | 'dramatic' | 'ghost';

export type MoodMotion = 'breathe' | 'bob' | 'wobble' | 'shake' | 'float';

export interface MoodStyle {
  /** Saturated mood color: pills, borders, accents. */
  color: string;
  /** Soft wash for face circles and card tints. */
  tint: string;
  /** Darker text color that passes contrast on the tint. */
  text: string;
  label: string;
  badge: string;
  motion: MoodMotion;
  /** Card opacity (ghosts are translucent). */
  opacity: number;
}

export const moods: Record<Mood, MoodStyle> = {
  cocky: {
    color: '#3DBE7A',
    tint: '#E3F7EC',
    text: '#1E7A4B',
    label: 'Cocky',
    badge: '😎',
    motion: 'breathe',
    opacity: 1,
  },
  chill: {
    color: '#4A90E2',
    tint: '#E4EFFC',
    text: '#2A5DA0',
    label: 'Chill',
    badge: '😌',
    motion: 'bob',
    opacity: 1,
  },
  nervous: {
    color: '#F2A91B',
    tint: '#FFF1D3',
    text: '#8A5A00',
    label: 'Nervous',
    badge: '😬',
    motion: 'wobble',
    opacity: 1,
  },
  dramatic: {
    color: '#FF6B5B',
    tint: '#FFE3DF',
    text: '#B2321F',
    label: 'Dramatic',
    badge: '😱',
    motion: 'shake',
    opacity: 1,
  },
  ghost: {
    color: '#9AA0A6',
    tint: '#EEF0F2',
    text: '#5E666D',
    label: 'Ghost',
    badge: '👻',
    motion: 'float',
    opacity: 0.6,
  },
};

export const moodOrder: Mood[] = ['dramatic', 'nervous', 'chill', 'cocky', 'ghost'];
