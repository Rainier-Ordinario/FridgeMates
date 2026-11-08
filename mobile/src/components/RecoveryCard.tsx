import type { ApiErrorKind } from '@/api/client';
import { useFridge } from '@/logic/store';
import { colors, radius, shadow, space, type Mood } from '@/theme';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from './AppText';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { Face } from './Face';
import { UiIcon } from './FoodIcon';

export type RecoveryKind = ApiErrorKind | 'empty' | 'few' | 'camera';

const copy: Record<RecoveryKind, { emoji: string; food: string; mood: Mood; name: string; text: string }> = {
  timeout: {
    emoji: '🥛',
    food: 'Greek yogurt',
    mood: 'chill',
    name: 'Sir Yogurtsworth',
    text: 'The fridge lost signal. Give it another go.',
  },
  offline: {
    emoji: '🧊',
    food: 'ice',
    mood: 'nervous',
    name: 'The Fridge',
    text: 'The fridge lost signal. Give it another go.',
  },
  http: {
    emoji: '🍅',
    food: 'Tomato',
    mood: 'nervous',
    name: 'Big Tom',
    text: 'The fridge lost signal. Give it another go.',
  },
  'bad-response': {
    emoji: '🍅',
    food: 'Tomato',
    mood: 'nervous',
    name: 'Big Tom',
    text: 'The fridge lost signal. Give it another go.',
  },
  empty: {
    emoji: '🔍',
    food: 'ice',
    mood: 'chill',
    name: 'The Fridge',
    text: "I couldn't spot any food. Try more light or get closer.",
  },
  camera: {
    emoji: '📷',
    food: 'ice',
    mood: 'nervous',
    name: 'FridgeMates',
    text: 'FridgeMates needs your camera to meet your food.',
  },
  few: {
    emoji: '💔',
    food: 'ice',
    mood: 'chill',
    name: 'The Fridge',
    text: 'No sparks yet. Scan more food to play matchmaker.',
  },
};

interface Props {
  kind: RecoveryKind;
  onRetry?: () => void;
  retryLabel?: string;
  /** After loading the demo fridge: close this screen (default) or stay. */
  closeAfterDemo?: boolean;
}

/** Friendly, in-character failure state with the two ways out: try again, or use the demo fridge. */
export function RecoveryCard({ kind, onRetry, retryLabel = 'Try again', closeAfterDemo = true }: Props) {
  const { loadDemo } = useFridge();
  const c = copy[kind];
  return (
    <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.card}>
      <View style={styles.row}>
        <Face food={c.food} emoji={c.emoji} mood={c.mood} size={56} label={c.name} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={colors.inkMuted}>
            {c.name}
          </AppText>
          <AppText variant="body">{c.text}</AppText>
        </View>
      </View>
      <View style={styles.buttons}>
        {onRetry && <PrimaryButton label={retryLabel} onPress={onRetry} />}
        <SecondaryButton
          icon={<UiIcon icon="ice" size={20} />}
          label="Use demo fridge"
          onPress={() => {
            loadDemo();
            if (closeAfterDemo && router.canGoBack()) router.back();
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.lg,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  buttons: { gap: space.sm },
});
