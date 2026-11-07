import { space } from '@/theme';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { RoundButton } from './Buttons';

interface Props {
  /** Leading button: back arrow, close cross, or none. */
  left?: 'back' | 'close' | null;
  onLeft?: () => void;
  /** String titles use the screenTitle style; pass a node for custom layouts. */
  title?: React.ReactNode;
  /** Trailing slot (chip, tag). */
  right?: React.ReactNode;
  /** Optional second row (captions, avatar stacks). */
  children?: React.ReactNode;
}

/** The one screen header: 64pt row, 24pt gutters, 48pt leading button. */
export function TopBar({ left = 'back', onLeft, title, right, children }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {left ? (
          <RoundButton
            emoji={left === 'back' ? '←' : '✕'}
            label={left === 'back' ? 'Back' : 'Close'}
            size={48}
            onPress={onLeft ?? (() => router.back())}
          />
        ) : null}
        <View style={styles.title}>
          {typeof title === 'string' ? (
            <AppText variant="screenTitle" numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
          ) : (
            title
          )}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1, justifyContent: 'center' },
  right: { flexShrink: 0 },
});
