import { space } from '@/theme';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Bottom action area: 24pt gutters and a bottom inset that clears the home indicator on every iPhone. */
export function DockedFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) + 10 }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.sm },
});
