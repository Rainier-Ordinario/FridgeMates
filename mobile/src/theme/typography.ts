import type { TextStyle } from 'react-native';

/**
 * Nunito is loaded in app/_layout.tsx. Until fonts load we fall back to the
 * system font so the first frame is never blank.
 */
export const fontFamily = {
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fontFamily.extrabold, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fontFamily.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 22 },
  bodyBold: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  captionBold: { fontFamily: fontFamily.extrabold, fontSize: 13, lineHeight: 18 },
  /** Section labels: 13/18 800, uppercase, 0.06em tracking, muted. */
  sectionLabel: {
    fontFamily: fontFamily.extrabold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.78,
    textTransform: 'uppercase',
  },
  /** Screen titles in the TopBar. */
  screenTitle: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26 },
  /** "It's a match!" */
  kicker: { fontFamily: fontFamily.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  small: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20 },
  smallBold: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20 },
  countdown: {
    fontFamily: fontFamily.extrabold,
    fontSize: 48,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof type;
