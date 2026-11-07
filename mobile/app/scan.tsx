import { api } from '@/api/client';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/Buttons';
import { Screen } from '@/components/Screen';
import { useFridge } from '@/logic/store';
import { colors, space } from '@/theme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function ScanScreen() {
  const { addScanned } = useFridge();
  const [message, setMessage] = useState('');

  async function runDemoScan() {
    setMessage('scanning...');
    try {
      const response = await api.scan({ image: 'demo-fridge-image' });
      addScanned(response.items);
      router.back();
    } catch {
      setMessage('scan failed');
    }
  }

  return (
    <Screen padded edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.center}>
        <AppText style={styles.emoji}>📷</AppText>
        <AppText variant="title" align="center">
          Scan is next
        </AppText>
        <AppText variant="body" color={colors.inkMuted} align="center">
          Camera or photo picker, then bringing your food to life, then new characters pop in.
        </AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          {message}
        </AppText>
      </View>
      <PrimaryButton label="Use demo scan" onPress={runDemoScan} style={styles.scan} />
      <PrimaryButton label="Back to fridge" onPress={() => router.back()} style={styles.back} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  emoji: { fontSize: 64, lineHeight: 72 },
  scan: { marginBottom: space.sm },
  back: { marginBottom: space.lg },
});
