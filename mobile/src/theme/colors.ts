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
  brandInk: '#FFFFFF',
  success: '#3DBE7A',
  danger: '#E5483A',
  overlay: 'rgba(43, 33, 24, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;
