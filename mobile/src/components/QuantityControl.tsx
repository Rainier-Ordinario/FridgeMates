import { colors, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

interface Props {
  label: string;
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

export function QuantityControl({ label, quantity, onChange, min = 1, max = 99 }: Props) {
  const adjust = (delta: number) => (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    const next = Math.max(min, Math.min(max, quantity + delta));
    if (next === quantity) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View style={styles.container}>
      <AppText variant="caption" color={colors.inkMuted}>
        {quantity === 0 ? 'Skipped' : 'Quantity'}
      </AppText>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label} quantity`}
          accessibilityState={{ disabled: quantity <= min }}
          disabled={quantity <= min}
          onPress={adjust(-1)}
          style={({ pressed }) => [styles.button, quantity <= min && styles.disabled, pressed && styles.pressed]}
        >
          <AppText variant="heading" color={colors.ink}>−</AppText>
        </Pressable>
        <AppText variant="bodyBold" style={styles.value} accessibilityLabel={`${quantity} ${label}`}>
          {quantity}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label} quantity`}
          accessibilityState={{ disabled: quantity >= max }}
          disabled={quantity >= max}
          onPress={adjust(1)}
          style={({ pressed }) => [styles.button, quantity >= max && styles.disabled, pressed && styles.pressed]}
        >
          <AppText variant="heading" color={colors.ink}>+</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
  },
  value: { minWidth: 24, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
});
