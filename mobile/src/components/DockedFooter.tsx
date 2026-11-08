import { space } from '@/theme';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Bottom action area: 24pt gutters and a bottom inset that clears the home indicator on every iPhone. */
export function DockedFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }, style]}>{children}</View>
  );
}

/** One footer row: a fixed-width secondary on the left and a flexing primary on the right, 10pt apart. */
export function FooterRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

/** Width of the secondary button in a FooterRow. */
export const FOOTER_SECONDARY_WIDTH = 150;

const styles = StyleSheet.create({
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
