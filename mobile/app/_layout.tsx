import { NudgeProvider } from '@/components/NudgeBanner';
import { SettingsProvider } from '@/logic/settings';
import { FridgeProvider } from '@/logic/store';
import { colors } from '@/theme';
import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // Keep the splash up until Nunito is ready; if the font fails we still render with the system font.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SettingsProvider>
      <FridgeProvider>
        <NudgeProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
            <Stack.Screen name="item/[id]" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="memorial" />
            <Stack.Screen name="match" />
            <Stack.Screen name="rescue" options={{ gestureEnabled: false }} />
          </Stack>
        </NudgeProvider>
      </FridgeProvider>
    </SettingsProvider>
  );
}
