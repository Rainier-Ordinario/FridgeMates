import { api } from '@/api/client';
import { USE_MOCK } from '@/api/config';
import type { ScanItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { PrimaryButton, RoundButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { MoodLoader } from '@/components/MoodLoader';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { moodFor } from '@/logic/mood';
import { useFridge } from '@/logic/store';
import { colors, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated';

type Phase = 'pick' | 'loading' | 'reveal';

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5,
  base64: true,
  allowsEditing: false,
};

/** Scan: camera or photo → "bringing your food to life…" → characters pop in → add to fridge. */
export default function ScanScreen() {
  const { addScanned } = useFridge();
  const [phase, setPhase] = useState<Phase>('pick');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [found, setFound] = useState<ScanItem[]>([]);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Dev/demo deep link: fridgemates://scan?demo=1 starts a mock scan immediately.
  const { demo } = useLocalSearchParams<{ demo?: string }>();

  useEffect(() => {
    if (demo && USE_MOCK && phase === 'pick' && found.length === 0) runScan('', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // Reveal characters one by one with a haptic tick each.
  useEffect(() => {
    if (phase !== 'reveal' || shown >= found.length) return;
    const t = setTimeout(
      () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShown((n) => n + 1);
      },
      shown === 0 ? 250 : 950,
    );
    return () => clearTimeout(t);
  }, [phase, shown, found.length]);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(
        source === 'camera' ? 'Camera permission is off. Try "Choose a photo".' : 'Photo access is off.',
      );
      return;
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    } catch {
      setError('No camera here (simulator?). Try "Choose a photo".');
      return;
    }
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await runScan(asset.base64 ?? '', asset.uri);
  }

  async function runScan(base64: string, uri: string | null) {
    setPhotoUri(uri);
    setPhase('loading');
    try {
      const res = await api.scan({ image: base64 });
      if (res.items.length === 0) {
        setError("Couldn't spot any food in that photo. Try a closer shot.");
        setPhase('pick');
        return;
      }
      setFound(res.items);
      setShown(0);
      setPhase('reveal');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Couldn't reach the fridge brain. Check EXPO_PUBLIC_API_URL, or use mock mode.");
      setPhase('pick');
    }
  }

  function finish() {
    addScanned(found);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <RoundButton emoji="✕" label="Close" size={44} onPress={() => router.back()} />
        <AppText variant="heading">{phase === 'reveal' ? 'Meet your food' : 'Scan food'}</AppText>
        <View style={{ width: 44 }} />
      </View>

      {phase === 'pick' && (
        <Animated.View entering={FadeIn} style={styles.pick}>
          <View style={styles.hero}>
            <AppText style={styles.heroEmoji}>🧊</AppText>
            <AppText variant="title" align="center">
              Who’s in the bag?
            </AppText>
            <AppText variant="body" color={colors.inkMuted} align="center">
              Snap your groceries or the inside of your fridge. Every item gets a face, a name and feelings.
            </AppText>
          </View>
          {error && (
            <View style={styles.errorBox}>
              <AppText variant="caption" color={colors.danger} align="center">
                {error}
              </AppText>
            </View>
          )}
          <View style={styles.pickButtons}>
            <PrimaryButton emoji="📷" label="Take a photo" onPress={() => pick('camera')} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Haptics.selectionAsync();
                pick('library');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <AppText variant="heading" color={colors.brandText}>
                🖼️ Choose a photo
              </AppText>
            </Pressable>
            {USE_MOCK && (
              <Pressable
                accessibilityRole="button"
                onPress={() => runScan('', null)}
                style={({ pressed }) => [styles.demo, pressed && styles.pressed]}
              >
                <AppText variant="caption" color={colors.inkMuted}>
                  ✨ Try a demo scan (mock mode, no photo needed)
                </AppText>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}

      {phase === 'loading' && (
        <Animated.View entering={FadeIn} style={styles.center}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.thumb} contentFit="cover" />}
          <MoodLoader />
        </Animated.View>
      )}

      {phase === 'reveal' && (
        <>
          <ScrollView contentContainerStyle={styles.reveal} showsVerticalScrollIndicator={false}>
            {/* Newest first, so every new character pops in at the top and the older ones slide down. */}
            {found
              .slice(0, shown)
              .map((item, i) => ({ item, i }))
              .reverse()
              .map(({ item, i }) => {
                const mood = moodFor(item.daysLeft);
                return (
                  <Animated.View
                    key={`${item.characterName}-${i}`}
                    entering={ZoomIn.springify().damping(11)}
                    layout={LinearTransition.springify().damping(14)}
                  >
                    <View style={styles.revealCard}>
                      <Face emoji={item.emoji} mood={mood} size={96} />
                      <AppText variant="title" align="center">
                        {item.characterName}
                      </AppText>
                      <AppText variant="caption" color={moods[mood].text} align="center">
                        {item.name} · {item.personality} · {item.daysLeft} days left
                      </AppText>
                      <SpeechBubble
                        text={`“${item.intro}”`}
                        tail="top"
                        tint={moods[mood].tint}
                        style={styles.bubble}
                      />
                    </View>
                  </Animated.View>
                );
              })}
            {shown < found.length && (
              <AppText variant="caption" color={colors.inkMuted} align="center">
                {`${found.length - shown} more waking up…`}
              </AppText>
            )}
          </ScrollView>
          {shown >= found.length && (
            <Animated.View entering={FadeIn.delay(300)} style={styles.footer}>
              <PrimaryButton
                emoji="🧊"
                label={
                  found.length === 1 ? 'Put them in the fridge' : `Put all ${found.length} in the fridge`
                }
                onPress={finish}
              />
            </Animated.View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  pick: { flex: 1, paddingHorizontal: space.lg, justifyContent: 'space-between', paddingBottom: space.lg },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
  },
  heroEmoji: { fontSize: 80, lineHeight: 92 },
  pickButtons: { gap: space.md },
  secondary: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: '#FFD3B3',
  },
  demo: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  errorBox: {
    backgroundColor: moods.dramatic.tint,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, padding: space.lg },
  thumb: { width: 96, height: 96, borderRadius: radius.md, ...shadow.card },
  reveal: { padding: space.lg, gap: space.lg, paddingBottom: space.lg },
  revealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    alignItems: 'center',
    gap: space.sm,
    ...shadow.card,
  },
  bubble: { marginTop: space.sm, alignSelf: 'stretch' },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
});
