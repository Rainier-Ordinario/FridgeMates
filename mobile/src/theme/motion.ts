/** Animation durations (ms) and the one spring we use. Loops must also check useReducedMotion(). */
export const motion = {
  fast: 180,
  base: 260,
  slow: 420,
  spring: { damping: 14 },
} as const;
