import { colors, type, type TypeToken } from '@/theme';
import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

interface Props extends TextProps {
  variant?: TypeToken;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** All text goes through here so the type scale and Nunito are used everywhere. */
export function AppText({ variant = 'body', color = colors.ink, align, style, ...rest }: Props) {
  return <Text {...rest} style={[type[variant], { color, textAlign: align }, styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
