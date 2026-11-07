import { plainTimeLabel } from '@/logic/mood';
import { colors, moods, space, type Mood } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Face } from './Face';
import { MoodPill } from './MoodPill';
import { QuantityControl } from './QuantityControl';

export interface FoodRowProps {
  /** Food name for the icon. */
  food: string;
  /** Display name (character name). */
  name: string;
  mood: Mood;
  daysLeft: number;
  /** Right-hand compact action ("Ate it" / "Toss"). */
  action?: { label: string; onPress: () => void; accessibilityLabel: string; color?: string };
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Freshly scanned: NEW tag + pop-in. */
  isNew?: boolean;
  /** Face motion loop (off for long static lists). */
  animated?: boolean;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  quantityMin?: number;
}

/**
 * Food icon, name, expiry and mood, with optional quantity controls and one action.
 * Row background is the mood tint; dramatic rows get a red border; ghost rows are dashed and faded.
 */
function FoodRowBase({
  food,
  name,
  mood,
  daysLeft,
  action,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  isNew = false,
  animated = true,
  quantity,
  onQuantityChange,
  quantityMin = 1,
}: FoodRowProps) {
  const m = moods[mood];
  const isGhost = mood === 'ghost';
  const isDramatic = mood === 'dramatic';
  const body = (
    <Animated.View
      entering={isNew ? ZoomIn.springify().damping(12) : undefined}
      style={[
        styles.row,
        { backgroundColor: m.tint, borderColor: m.color },
        isDramatic && styles.dramatic,
        isGhost && styles.ghost,
      ]}
    >
      {isNew && (
        <View style={styles.newTag}>
          <AppText style={styles.newTagText} color={colors.ink}>
            NEW
          </AppText>
        </View>
      )}
      <View style={styles.details}>
        <View style={styles.main}>
          <Face food={food} mood={mood} size={44} animated={animated} showBadge={false} />
          <View style={styles.text}>
            <AppText style={styles.name} numberOfLines={1}>
              {name}
            </AppText>
            <View style={styles.meta}>
              <AppText style={styles.time} color={m.text} numberOfLines={1}>
                {plainTimeLabel(daysLeft)}
              </AppText>
              <MoodPill mood={mood} compact />
            </View>
          </View>
          {action && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                action.onPress();
              }}
              hitSlop={6}
              style={({ pressed }) => [
                styles.action,
                { borderColor: action.color ?? colors.ink },
                pressed && styles.actionPressed,
              ]}
            >
              <AppText style={styles.actionText} color={action.color ?? colors.ink}>
                {action.label}
              </AppText>
            </Pressable>
          )}
        </View>
        {quantity !== undefined && onQuantityChange && (
          <QuantityControl label={name} quantity={quantity} onChange={onQuantityChange} min={quantityMin} />
        )}
      </View>
    </Animated.View>
  );
  if (!onPress) return <View style={styles.wrap}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${name}, ${m.label}, ${plainTimeLabel(daysLeft)}`}
      accessibilityHint={accessibilityHint ?? 'Opens the character'}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

export const FoodRow = React.memo(FoodRowBase);

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  pressed: { transform: [{ scale: 0.99 }] },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dramatic: { borderWidth: 2, borderColor: colors.danger },
  ghost: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: moods.ghost.color, opacity: 0.6 },
  newTag: {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: colors.brand,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  newTagText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 10, lineHeight: 14 },
  details: { flex: 1 },
  main: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontFamily: 'Nunito_700Bold', fontSize: 16, lineHeight: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 14, lineHeight: 18, flexShrink: 1 },
  action: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  actionText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, lineHeight: 18 },
});
