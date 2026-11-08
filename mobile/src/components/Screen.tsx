import { colors, space } from '@/theme';
import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface Props extends ViewProps {
  edges?: Edge[];
  padded?: boolean;
}

/** Cream background + safe area. Every screen starts here. */
export function Screen({
  edges = ['top', 'left', 'right'],
  padded = false,
  style,
  children,
  ...rest
}: Props) {
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View {...rest} style={[styles.body, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  padded: { paddingHorizontal: space.lg },
});
