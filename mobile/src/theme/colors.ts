/** Core palette: warm, cozy, readable on a projector. */
export const colors = {
  bg: '#FFF7EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF1DE',
  ink: '#2B2118',
  inkMuted: '#7A6B5E',
  inkFaint: '#B5A89A',
  line: '#EFE4D6',
  brand: '#FF8A3D',
  brandDark: '#E8702A',
  /** Text on brand/success buttons: dark ink passes 4.5:1 (6.7:1 on tangerine, 6.6:1 on green). */
  brandInk: '#2B2118',
  /** Brand-colored text on cream/white surfaces (5.3:1). */
  brandText: '#A8471A',
  success: '#3DBE7A',
  danger: '#E5483A',
  /** Danger button fill; white label passes 5.4:1. */
  dangerStrong: '#C0392B',
  overlay: 'rgba(43, 33, 24, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;
