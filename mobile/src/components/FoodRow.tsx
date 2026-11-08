import { daysPillLabel, plainTimeLabel } from '@/logic/mood';
import { colors, moods, type Mood } from '@/theme';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  ZoomIn,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Face } from './Face';
import { UiIcon } from './FoodIcon';
import { CloseIcon } from './Icons';
import { QuantityControl } from './QuantityControl';

export interface FoodRowProps {
  /** Food name for the icon and the second line. */
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
  /** Units of this item. With `onQuantityChange` a stepper shows under the row; without it, "×N" sits next to the name when N > 1. */
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  quantityMin?: number;
  /** Swipe left to reveal "Remove"; a full swipe removes right away. */
  onRemove?: () => void;
  /** Called while a row is being dragged / closed, so a parent pager can lock horizontal paging. */
  onSwipeState?: (dragging: boolean) => void;
  /** Also show a 44pt ✕ on the right that removes (scan results). */
  removeButton?: boolean;
  /** Crop of the scanned photo (falls back to the icon). */
  photo?: string;
}

/** Only one row stays open at a time. */
let openRow: SwipeableMethods | null = null;
export function closeOpenRow() {
  openRow?.close();
  openRow = null;
}

const ACTION_WIDTH = 96;
const FULL_SWIPE_RATIO = 0.6;

/**
 * 60pt row: face (or photo crop) 40, name, then the food name and a days pill ("Nervous · 2 days"),
 * with optional quantity controls, one action, and swipe-to-remove.
 * Row background is the mood tint; dramatic rows get a red border; ghost rows are dashed with a faded face.
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
  onRemove,
  onSwipeState,
  removeButton = false,
  photo,
}: FoodRowProps) {
  const m = moods[mood];
  const isGhost = mood === 'ghost';
  const isDramatic = mood === 'dramatic';
  const { width } = useWindowDimensions();
  const showCount = quantity !== undefined && quantity > 1 && !onQuantityChange;
  const swipeRef = useRef<SwipeableMethods>(null);
  const rowWidth = useSharedValue(300);
  const farthest = useSharedValue(0);
  const fullSwipe = useRef(false);

  function remove() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (openRow === swipeRef.current) openRow = null;
    onRemove?.();
  }

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
          <View style={isGhost && styles.ghostFace}>
            <Face food={food} mood={mood} size={40} animated={animated} showBadge={false} photo={photo} />
          </View>
          <View style={styles.text}>
            <View style={styles.nameRow}>
              <AppText style={styles.name} numberOfLines={1}>
                {name}
              </AppText>
              {showCount && (
                <AppText
                  style={styles.count}
                  color={colors.inkMuted}
                  accessibilityLabel={`${quantity} of them`}
                >
                  ×{quantity}
                </AppText>
              )}
            </View>
            <View style={styles.meta}>
              <AppText style={styles.food} color={m.text} numberOfLines={1}>
                {food}
              </AppText>
              <View style={[styles.pill, { borderColor: m.color }]}>
                <AppText style={styles.pillText} color={m.text} numberOfLines={1}>
                  {daysPillLabel(mood, daysLeft, width < 380)}
                </AppText>
              </View>
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
          {removeButton && onRemove && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name}`}
              onPress={remove}
              hitSlop={4}
              style={({ pressed }) => [styles.removeButton, pressed && styles.actionPressed]}
            >
              <CloseIcon size={18} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>
        {quantity !== undefined && onQuantityChange && (
          <QuantityControl label={name} quantity={quantity} onChange={onQuantityChange} min={quantityMin} />
        )}
      </View>
    </Animated.View>
  );

  const a11yLabel = accessibilityLabel ?? `${name}, ${food}, ${m.label}, ${plainTimeLabel(daysLeft)}`;

  const pressable = onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint ?? 'Opens the character'}
      accessibilityActions={onRemove ? [{ name: 'remove', label: 'Remove' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'remove') onRemove?.();
      }}
      onPress={() => {
        // Tapping any row closes whichever row is open.
        if (openRow) {
          closeOpenRow();
          return;
        }
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  ) : onRemove ? (
    <View
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityActions={[{ name: 'remove', label: 'Remove' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'remove') remove();
      }}
    >
      {body}
    </View>
  ) : (
    body
  );

  if (!onRemove) return <View style={styles.wrap}>{pressable}</View>;

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => rowWidth.set(e.nativeEvent.layout.width)}>
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={1.6}
        rightThreshold={56}
        overshootRight
        onSwipeableOpenStartDrag={() => {
          onSwipeState?.(true);
          farthest.set(0);
          fullSwipe.current = false;
        }}
        onSwipeableWillOpen={() => {
          if (openRow && openRow !== swipeRef.current) openRow.close();
          openRow = swipeRef.current;
          if (!fullSwipe.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onSwipeableOpen={() => {
          onSwipeState?.(false);
          if (fullSwipe.current) remove();
        }}
        onSwipeableClose={() => {
          onSwipeState?.(false);
          if (openRow === swipeRef.current) openRow = null;
        }}
        renderRightActions={(_progress, translation) => (
          <RemoveAction
            translation={translation}
            rowWidth={rowWidth}
            onFull={() => (fullSwipe.current = true)}
            onPress={remove}
          />
        )}
      >
        <View style={styles.opaque}>{pressable}</View>
      </ReanimatedSwipeable>
    </View>
  );
}

function RemoveAction({
  translation,
  rowWidth,
  onFull,
  onPress,
}: {
  translation: SharedValue<number>;
  rowWidth: SharedValue<number>;
  onFull: () => void;
  onPress: () => void;
}) {
  // A drag past 60% of the row counts as a full swipe (decided on the UI thread, applied on open).
  useAnimatedReaction(
    () => translation.value,
    (x) => {
      if (x < -rowWidth.value * FULL_SWIPE_RATIO) runOnJSOnce(onFull);
    },
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Remove" onPress={onPress} style={styles.remove}>
      <UiIcon icon="wastebasket" size={22} />
      <AppText style={styles.removeText} color={colors.surface}>
        Remove
      </AppText>
    </Pressable>
  );
}

// Reanimated worklet → JS bridge for the full-swipe flag.
function runOnJSOnce(fn: () => void) {
  'worklet';
  runOnJS(fn)();
}

export const FoodRow = React.memo(FoodRowBase);

const styles = StyleSheet.create({
  wrap: { marginBottom: 6 },
  opaque: { backgroundColor: colors.bg, borderRadius: 16 },
  pressed: { transform: [{ scale: 0.99 }] },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dramatic: { borderWidth: 2, borderColor: colors.danger },
  ghost: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: moods.ghost.color },
  ghostFace: { opacity: 0.6 },
  newTag: {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: colors.brand,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 2,
  },
  newTagText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, lineHeight: 16 },
  details: { flex: 1 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, gap: 2, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  name: { fontFamily: 'Nunito_700Bold', fontSize: 16, lineHeight: 20, flexShrink: 1 },
  count: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  food: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 18, flexShrink: 1 },
  pill: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    flexShrink: 0,
  },
  pillText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, lineHeight: 19 },
  action: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
  actionPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  actionText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, lineHeight: 18 },
  remove: {
    width: ACTION_WIDTH,
    marginLeft: 8,
    borderRadius: 16,
    backgroundColor: colors.dangerStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  removeText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, lineHeight: 18 },
});
