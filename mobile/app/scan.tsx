import { api, apiErrorKind } from '@/api/client';
import { USE_MOCK } from '@/api/config';
import type { ScanItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Confetti } from '@/components/Confetti';
import { PrimaryButton, RoundButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { MoodLoader } from '@/components/MoodLoader';
import { MoodPill } from '@/components/MoodPill';
import { DockedFooter } from '@/components/DockedFooter';
import { RecoveryCard, type RecoveryKind } from '@/components/RecoveryCard';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { SpeechBubble } from '@/components/SpeechBubble';
import { moodFor } from '@/logic/mood';
import { playPop, playTada } from '@/logic/sounds';
import { useFridge } from '@/logic/store';
import { colors, moodOrder, moods, motion, radius, shadow, space } from '@/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  ZoomIn,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Phase = 'camera' | 'pick' | 'loading' | 'reveal';

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5,
  base64: true,
  allowsEditing: false,
};

/** Scan: viewfinder (or photo picker) → "bringing your food to life…" → characters pop in → add to fridge. */
export default function ScanScreen() {
  const { addScanned } = useFridge();
  // Dev params: ?demo=1 runs a mock scan; ?camera=1 forces the viewfinder (to preview its layout on a simulator).
  const { demo, camera, fail } = useLocalSearchParams<{ demo?: string; camera?: string; fail?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Simulators have no camera: start on the picker so the flow still works.
  const [phase, setPhase] = useState<Phase>(Device.isDevice || camera ? 'camera' : 'pick');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [found, setFound] = useState<ScanItem[]>([]);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<RecoveryKind | null>(null);
  const [foundNote, setFoundNote] = useState<string | null>(null);

  // Dev/demo deep link: fridgemates://scan?demo=1 starts a mock scan immediately.
  useEffect(() => {
    if (demo && USE_MOCK && found.length === 0) runScan('', null);
    // ?fail=timeout|offline|empty previews the recovery cards.
    if (fail && USE_MOCK) {
      const id = setTimeout(() => {
        setPhase('pick');
        setFailure(fail as RecoveryKind);
      }, 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, fail]);

  // Ask for the camera once we're on the viewfinder; fall back to the picker if refused.
  useEffect(() => {
    if (phase !== 'camera' || !permission || permission.granted) return;
    if (permission.canAskAgain) {
      requestPermission().then((res) => {
        if (!res.granted) setPhase('pick');
      });
    } else {
      const id = setTimeout(() => setPhase('pick'), 0);
      return () => clearTimeout(id);
    }
  }, [phase, permission, requestPermission]);

  // Reveal characters one by one: haptic tick + soft pop as each one lands.
  useEffect(() => {
    if (phase !== 'reveal' || shown >= found.length) return;
    const t = setTimeout(
      () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        playPop();
        setShown((n) => n + 1);
      },
      shown === 0 ? 150 : 380,
    );
    return () => clearTimeout(t);
  }, [phase, shown, found.length]);

  // Everyone has arrived: a short celebration before the button appears.
  const allArrived = phase === 'reveal' && found.length > 0 && shown >= found.length;
  useEffect(() => {
    if (!allArrived) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playTada();
  }, [allArrived]);

  async function shutter() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const pic = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.5,
        skipProcessing: true,
      });
      if (!pic) throw new Error('no picture');
      await runScan(pic.base64 ?? '', pic.uri);
    } catch {
      setError('The camera blinked. Try again or choose a photo.');
      setPhase('pick');
    }
  }

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
    setError(null);
    setFailure(null);
    setFoundNote(null);
    setPhase('loading');
    try {
      const res = await api.scan({ image: base64 });
      const items = Array.isArray(res?.items) ? res.items : [];
      if (items.length === 0) {
        setFailure('empty');
        setPhase('pick');
        return;
      }
      const printed = items.filter((i) => i.dateSource === 'printed').length;
      setFoundNote(
        `Found ${items.length} item${items.length === 1 ? '' : 's'} · ${printed} printed date${printed === 1 ? '' : 's'}, ${items.length - printed} estimated`,
      );
      setFound(items);
      setShown(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setPhase('reveal'), 600);
    } catch (err) {
      setFailure(apiErrorKind(err));
      setPhase('pick');
    }
  }

  function finish() {
    addScanned(found);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  if (phase === 'camera') {
    return (
      <Viewfinder
        ready={!!permission?.granted}
        cameraRef={cameraRef}
        onShutter={shutter}
        onGallery={() => pick('library')}
        onClose={() => router.back()}
      />
    );
  }

  return (
    <Screen>
      <TopBar
        left="close"
        title={phase === 'reveal' ? 'Meet your food' : 'Scan food'}
        right={
          phase === 'reveal' ? (
            <View style={styles.newTag} accessible accessibilityLabel={`${found.length} new`}>
              <AppText variant="captionBold" color={colors.ink}>
                +{found.length} new
              </AppText>
            </View>
          ) : undefined
        }
      />

      {phase === 'pick' && (
        <Animated.View entering={FadeIn} style={styles.pick}>
          <View style={styles.hero}>
            <AppText style={styles.heroEmoji}>🧊</AppText>
            <AppText variant="title" align="center">
              What did you bring home?
            </AppText>
            <AppText variant="body" color={colors.inkMuted} align="center">
              Snap your groceries or your fridge shelf. Every item gets a face, a name and feelings.
            </AppText>
          </View>
          {failure && (
            <RecoveryCard
              kind={failure}
              retryLabel={failure === 'empty' ? 'Try another photo' : 'Try again'}
              onRetry={() => {
                setFailure(null);
                if (Device.isDevice) setPhase('camera');
              }}
            />
          )}
          {error && (
            <View style={styles.errorBox}>
              <AppText variant="caption" color={moods.dramatic.text} align="center">
                {error}
              </AppText>
            </View>
          )}
          <View style={styles.pickButtons}>
            <PrimaryButton
              emoji="📷"
              label="Take a photo"
              onPress={() => (Device.isDevice ? setPhase('camera') : pick('camera'))}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a photo"
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
                accessibilityLabel="Try a demo scan"
                onPress={() => runScan('', null)}
                style={({ pressed }) => [styles.demo, pressed && styles.pressed]}
              >
                <AppText variant="caption" color={colors.inkMuted}>
                  No camera? Try a demo scan ✨
                </AppText>
              </Pressable>
            )}
          </View>
          )}
        </Animated.View>
      )}

      {phase === 'loading' && (
        <Animated.View entering={FadeIn} style={styles.center}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.thumb} contentFit="cover" />}
          <MoodLoader />
          <View style={styles.dots}>
            {moodOrder.map((m) => (
              <View key={m} style={[styles.dot, { backgroundColor: moods[m].color }]} />
            ))}
          </View>
          {foundNote && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.foundNote}>
              <AppText variant="caption" color={colors.inkMuted} align="center">
                {foundNote}
              </AppText>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {phase === 'reveal' && (
        <>
          <AppText variant="body" color={colors.inkMuted} style={styles.sub}>
            They just woke up. Be nice.
          </AppText>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.reveal}
            showsVerticalScrollIndicator={false}
          >
            {found.slice(0, shown).map((item, i) => {
              const mood = moodFor(item.daysLeft);
              return (
                <Animated.View
                  key={`${item.characterName}-${i}`}
                  entering={ZoomIn.springify().damping(12)}
                  style={styles.row}
                >
                  <Face
                    emoji={item.emoji}
                    mood={mood}
                    size={56}
                    label={`${item.characterName}, ${moods[mood].label}`}
                  />
                  <View style={styles.rowBody}>
                    <View style={styles.nameRow}>
                      <AppText variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {item.characterName}
                      </AppText>
                      <MoodPill mood={mood} daysLeft={item.daysLeft} compact />
                    </View>
                    <SpeechBubble text={item.intro} tail="left" compact style={styles.bubble} />
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
          {allArrived && (
            <>
              <Confetti count={24} />
              <Animated.View entering={FadeIn.duration(motion.base)} style={styles.arrived}>
                <AppText variant="caption" color={colors.inkMuted} align="center">
                  🎉 Everyone’s here. Be nice to them.
                </AppText>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(250).duration(motion.base)}>
                <DockedFooter>
                  <PrimaryButton emoji="🧊" label="Put them in the fridge" onPress={finish} />
                </DockedFooter>
              </Animated.View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

/** Full-bleed camera with tangerine corner brackets, a sweeping scan line, and the shutter row. */
function Viewfinder({
  ready,
  cameraRef,
  onShutter,
  onGallery,
  onClose,
}: {
  ready: boolean;
  cameraRef: React.RefObject<CameraView | null>;
  onShutter: () => void;
  onGallery: () => void;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const frame = { left: 40, top: 190, width: width - 80, height: 400 };

  const sweep = useSharedValue(0.5);
  const press = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [reduceMotion, sweep]);
  const lineStyle = useAnimatedStyle(() => ({
    top: interpolate(sweep.value, [0, 1], [0, frame.height - 3]),
  }));
  const shutterStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <View style={styles.cameraGround}>
      <StatusBar style="light" />
      {ready && <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />}
      <View style={[styles.hintPill, { top: Math.max(insets.top + 20, 126) }]}>
        <AppText variant="smallBold">Fit your groceries in the frame</AppText>
      </View>
      <View pointerEvents="none" style={[styles.frame, frame]}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
        <Animated.View style={[styles.scanLine, lineStyle]} />
      </View>
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 24) + 10 }]}>
        <View style={styles.dockItem}>
          <RoundButton emoji="🖼️" label="Choose a photo" dark onPress={onGallery} />
          <AppText variant="caption" color={colors.surface}>
            Photos
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          onPressIn={() => {
            press.set(withSequence(withTiming(0.92, { duration: 60 }), withTiming(1, { duration: 120 })));
          }}
          onPress={onShutter}
        >
          <View style={styles.dockItem}>
            <Animated.View style={[styles.shutterRing, shutterStyle]}>
              <View style={styles.shutterCore} />
            </Animated.View>
            <AppText variant="caption" color={colors.surface}>
              Snap
            </AppText>
          </View>
        </Pressable>
        <View style={styles.dockItem}>
          <RoundButton emoji="✕" label="Close" dark onPress={onClose} />
          <AppText variant="caption" color={colors.surface}>
            Close
          </AppText>
        </View>
      </View>
    </View>
  );
}

const CORNER = 44;

const styles = StyleSheet.create({
  newTag: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sub: { paddingHorizontal: space.xl, paddingBottom: space.md },
  pick: {
    flex: 1,
    paddingHorizontal: space.xl,
    justifyContent: 'space-between',
    paddingBottom: space.xl + 10,
  },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.lg },
  thumb: { width: 96, height: 96, borderRadius: radius.md, ...shadow.card },
  dots: { flexDirection: 'row', gap: 8, marginTop: space.xs },
  dot: { width: 12, height: 12, borderRadius: 6 },
  foundNote: { position: 'absolute', bottom: 34, left: 0, right: 0 },
  reveal: { paddingHorizontal: space.xl, paddingBottom: space.md, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowBody: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubble: { alignSelf: 'stretch', alignItems: 'flex-start' },
  arrived: { paddingTop: space.xs },
  // viewfinder
  cameraGround: { flex: 1, backgroundColor: '#1F1812' },
  hintPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,247,236,0.94)',
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  frame: { position: 'absolute' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.brand },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 20 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 20 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 20 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 20 },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: colors.brand,
    borderRadius: 2,
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  dock: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dockItem: { alignItems: 'center', gap: 6 },
  shutterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand },
});
