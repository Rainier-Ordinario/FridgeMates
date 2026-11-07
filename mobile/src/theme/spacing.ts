import type { ViewStyle } from 'react-native';

/** 4-pt grid. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

/** Minimum tappable size (thumb-friendly, projector-friendly). */
export const hit = {
  min: 48,
  primary: 56,
} as const;

/** One soft shadow for all cards. */
export const shadow = {
  card: {
    shadowColor: '#2B2118',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button: {
    shadowColor: '#E8702A',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} satisfies Record<string, ViewStyle>;
