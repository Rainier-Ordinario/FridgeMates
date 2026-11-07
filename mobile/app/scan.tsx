import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { Screen } from '@/components/Screen';
import { colors, space } from '@/theme';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Placeholder so the scan button has somewhere to go. Real scan flow is the next step. */
export default function ScanScreen() {
  return (
    <Screen padded edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.center}>
        <AppText style={styles.emoji}>📷</AppText>
        <AppText variant="title" align="center">
          Scan is next
        </AppText>
        <AppText variant="body" color={colors.inkMuted} align="center">
          Camera or photo picker, then “bringing your food to life…”, then new characters pop in.
        </AppText>
      </View>
      <PrimaryButton label="Back to fridge" onPress={() => router.back()} style={styles.back} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  emoji: { fontSize: 64, lineHeight: 72 },
  back: { marginBottom: space.lg },
});
