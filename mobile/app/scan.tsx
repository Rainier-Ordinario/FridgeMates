import { api, apiErrorKind } from '@/api/client';
import { USE_MOCK } from '@/api/config';
import type { ScanItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { UiIcon } from '@/components/FoodIcon';
import { Confetti } from '@/components/Confetti';
import { PrimaryButton, RoundButton, SecondaryButton } from '@/components/Buttons';
import { FoodRow } from '@/components/FoodRow';
import { Toast, useToastState } from '@/components/NudgeBanner';
import { ScanLoader } from '@/components/ScanLoader';
import { DockedFooter } from '@/components/DockedFooter';
import { RecoveryCard, type RecoveryKind } from '@/components/RecoveryCard';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { cropItemPhoto, deleteCrop, type SourcePhoto } from '@/logic/crops';
import { moodFor } from '@/logic/mood';
import { playPop, playTada } from '@/logic/sounds';
import { requestNotificationPermission } from '@/logic/notifications';
import { useSettings } from '@/logic/settings';
import { useFridge } from '@/logic/store';
import { colors, moods, motion, radius, shadow, space } from '@/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
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
/** A scan result with a stable list key (names can repeat). */
type Found = ScanItem & { key: string; photo?: string };

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5,
  base64: true,
  allowsEditing: false,
};

/** Scan: viewfinder (or photo picker) → "Scanning your food…" → characters pop in → add to fridge. */
export default function ScanScreen() {
  const { addScanned } = useFridge();
  const settings = useSettings();
  const reduceMotion = useReducedMotion();
  // Dev params: ?demo=1 runs a mock scan; ?camera=1 forces the viewfinder (to preview its layout on a simulator).
  // ?photo=<file uri> crops the mock boxes out of that file; ?add=1 adds the results by itself (both mock-only).
  const {
    demo,
    camera,
    fail,
    photo: photoParam,
    add: addParam,
  } = useLocalSearchParams<{ demo?: string; camera?: string; fail?: string; photo?: string; add?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const nonce = useRef(0);

  // Simulators have no camera: start on the picker so the flow still works.
  const [phase, setPhase] = useState<Phase>(Device.isDevice || camera ? 'camera' : 'pick');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [found, setFound] = useState<Found[]>([]);
  const { toast, showToast, dismissToast } = useToastState();
  // Crops of results that never reach the fridge are deleted when the screen goes away.
  const committed = useRef(false);
  const foundRef = useRef<Found[]>([]);
  useEffect(() => {
    foundRef.current = found;
  }, [found]);
  useEffect(
    () => () => {
      if (!committed.current) for (const f of foundRef.current) deleteCrop(f.photo);
    },
    [],
  );
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<RecoveryKind | null>(null);
  const [foundNote, setFoundNote] = useState<string | null>(null);

  // Dev/demo deep link: fridgemates://scan?demo=1 starts a mock scan immediately.
  useEffect(() => {
    if (demo && USE_MOCK && found.length === 0) runScan('', photoParam ? { uri: photoParam } : null);
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
        if (!res.granted) {
          setPhase('pick');
          setFailure('camera');
        }
      });
    } else {
      const id = setTimeout(() => {
        setPhase('pick');
        setFailure('camera');
      }, 0);
      return () => clearTimeout(id);
    }
  }, [phase, permission, requestPermission]);

  // Reveal characters one by one: haptic tick + soft pop as each one lands.
  useEffect(() => {
    if (phase !== 'reveal' || shown >= found.length) return;
    // Reduce Motion: everyone at once, no stagger.
    if (reduceMotion) {
      const id = setTimeout(() => setShown(found.length), 0);
      return () => clearTimeout(id);
    }
    const t = setTimeout(
      () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        playPop();
        setShown((n) => n + 1);
      },
      shown === 0 ? 150 : 350,
    );
    return () => clearTimeout(t);
  }, [phase, shown, found, reduceMotion]);

  // Everyone has arrived: a short celebration before the button appears.
  const allArrived = phase === 'reveal' && found.length > 0 && shown >= found.length;
  // Dev link ?add=1: add the results without a tap (mock only).
  useEffect(() => {
    if (!allArrived || !addParam || !USE_MOCK) return;
    const id = setTimeout(() => finish(undefined, true), 2500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allArrived, addParam]);

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
      await runScan(pic.base64 ?? '', { uri: pic.uri, width: pic.width, height: pic.height });
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
      if (source === 'camera') setFailure('camera');
      else setError('Photo access is off. Allow Photos in Settings, or take a photo instead.');
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
    await runScan(asset.base64 ?? '', { uri: asset.uri, width: asset.width, height: asset.height });
  }

  async function runScan(base64: string, photo: SourcePhoto | null) {
    setPhotoUri(photo?.uri ?? null);
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
      // Most urgent first, like the fridge.
      nonce.current += 1;
      const sorted: Found[] = [...items]
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .map((it, i) => ({ ...it, key: `${nonce.current}-${i}` }));
      // Thumbnails: a padded square around each item's box, cut from the photo on the device.
      const withCrops = photo
        ? await Promise.all(
            sorted.map(async (it) =>
              it.box ? { ...it, photo: (await cropItemPhoto(photo, it.box, it.key)) ?? undefined } : it,
            ),
          )
        : sorted;
      setFound(withCrops);
      setShown(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setPhase('reveal'), 600);
    } catch (err) {
      setFailure(apiErrorKind(err));
      setPhase('pick');
    }
  }

  /** Drops a result before it reaches the fridge. Undo (5 s) puts it back in the same spot. */
  function removeFound(key: string) {
    const index = found.findIndex((f) => f.key === key);
    if (index < 0) return;
    const item = found[index];
    setFound((list) => list.filter((f) => f.key !== key));
    showToast(`Removed ${item.characterName}`, {
      label: 'Undo',
      onExpire: () => deleteCrop(item.photo),
      onPress: () =>
        setFound((list) => {
          if (list.some((f) => f.key === key)) return list;
          const next = [...list];
          next.splice(Math.min(index, next.length), 0, item);
          return next;
        }),
    });
  }

  /** Everyone was removed: back to the start. */
  function scanAgain() {
    dismissToast('expire');
    for (const f of found) deleteCrop(f.photo);
    setFound([]);
    setShown(0);
    setPhotoUri(null);
    setFoundNote(null);
    setPhase(Device.isDevice ? 'camera' : 'pick');
  }

  /** Put the new characters in the fridge, close Scan, and optionally continue to another screen. */
  function finish(next?: 'cook', skipAsk = false) {
    committed.current = true;
    addScanned(found);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const go = () => {
      router.back();
      if (next)
        setTimeout(
          () =>
            router.navigate({
              pathname: '/',
              params: { manager: '1', cook: '1', t: String(++nonce.current) },
            }),
          120,
        );
    };
    // Sensible moment to ask: right after the first scan, with a one-line explanation.
    if (!settings.notificationsAsked && !skipAsk) {
      settings.set('notificationsAsked', true);
      Alert.alert(
        'Let your food text you?',
        'At most 2 a day, never at night. You can change this in Settings.',
        [
          { text: 'Not now', style: 'cancel', onPress: go },
          {
            text: 'Allow',
            onPress: () => {
              requestNotificationPermission().then((ok) => settings.set('notifications', ok));
              go();
            },
          },
        ],
      );
      return;
    }
    go();
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
        title={phase === 'reveal' ? '' : 'Scan food'}
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
            <UiIcon icon="ice" size={80} />
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
              retryLabel={
                failure === 'camera' ? 'Allow camera' : failure === 'empty' ? 'Try again' : 'Try again'
              }
              onRetry={() => {
                if (failure === 'camera') {
                  Linking.openSettings().catch(() => {});
                  setFailure(null);
                  return;
                }
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
          {!failure && (
            <View style={styles.pickButtons}>
              <PrimaryButton
                icon={<UiIcon icon="camera" size={24} />}
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
                  Choose a photo
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
                    No camera? Try a demo scan
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
          <ScanLoader />
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
          <AppText variant="kicker" style={styles.revealTitle} accessibilityRole="header">
            Meet your fridge
          </AppText>
          <AppText style={styles.sub} color={colors.inkMuted}>
            {found.length === 0
              ? 'Everyone was sent back.'
              : `${found.length === 1 ? '1 roommate' : `${found.length} roommates`} just woke up. Be nice.`}
          </AppText>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.reveal}
            showsVerticalScrollIndicator={false}
          >
            {found.slice(0, shown).map((item) => {
              const mood = moodFor(item.daysLeft);
              return (
                <Animated.View
                  key={item.key}
                  entering={reduceMotion ? undefined : ZoomIn.springify().damping(12)}
                  exiting={reduceMotion ? undefined : FadeOut.duration(motion.fast)}
                  layout={reduceMotion ? undefined : LinearTransition.duration(motion.base)}
                >
                  <FoodRow
                    food={item.name}
                    name={item.characterName}
                    mood={mood}
                    daysLeft={item.daysLeft}
                    photo={item.photo}
                    onRemove={() => removeFound(item.key)}
                    removeButton
                  />
                </Animated.View>
              );
            })}
          </ScrollView>
          {allArrived && (
            <>
              <Confetti count={24} />
              <Animated.View entering={FadeIn.duration(motion.base)} style={styles.arrived}>
                <AppText variant="caption" color={colors.inkMuted} align="center">
                  Everyone’s here. Be nice to them.
                </AppText>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(100).duration(200)}>
                <DockedFooter>
                  {found.length >= 2 && (
                    <View style={styles.resultRow}>
                      <SecondaryButton
                        label="What should I cook?"
                        outlined
                        onPress={() => finish('cook')}
                        style={styles.half}
                      />
                    </View>
                  )}
                  <PrimaryButton
                    icon={<UiIcon icon="ice" size={22} />}
                    label={`Add ${found.length} to fridge`}
                    onPress={() => finish()}
                  />
                </DockedFooter>
              </Animated.View>
            </>
          )}
          {found.length === 0 && (
            <Animated.View entering={FadeIn.duration(motion.base)}>
              <DockedFooter>
                <PrimaryButton
                  icon={<UiIcon icon="camera" size={22} />}
                  label="Scan again"
                  onPress={scanAgain}
                />
              </DockedFooter>
            </Animated.View>
          )}
          {toast && (
            <Toast
              key={toast.key}
              text={toast.text}
              action={toast.action}
              offset={found.length >= 2 ? 180 : 110}
              onDone={() => dismissToast('action')}
            />
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
          <RoundButton
            icon={<UiIcon icon="framed-picture" size={26} />}
            label="Choose a photo"
            dark
            onPress={onGallery}
          />
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
  revealTitle: { paddingHorizontal: space.xl, paddingTop: space.xs },
  sub: {
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
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
  foundNote: { position: 'absolute', bottom: 34, left: 0, right: 0 },
  resultRow: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
  reveal: { paddingHorizontal: space.xl, paddingBottom: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: 12,
  },
  rowBody: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
