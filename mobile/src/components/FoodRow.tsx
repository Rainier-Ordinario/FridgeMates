import { plainTimeLabel } from '@/logic/mood';
import { colors, moods, space, type Mood } from '@/theme';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  ZoomIn,
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Face } from './Face';
import { UiIcon } from './FoodIcon';
import { MoodPill } from './MoodPill';

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
  /** Swipe left to reveal "Remove"; a full swipe removes right away. */
  onRemove?: () => void;
  /** Called while a row is being dragged / closed, so a parent pager can lock horizontal paging. */
  onSwipeState?: (dragging: boolean) => void;
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
 * Compact 72pt row: food icon in a mood-tinted circle, name, plain-language time + mood pill, and one action.
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
  onRemove,
  onSwipeState,
}: FoodRowProps) {
  const m = moods[mood];
  const isGhost = mood === 'ghost';
  const isDramatic = mood === 'dramatic';
  const swipeRef = useRef<SwipeableMethods>(null);
  const rowWidth = useSharedValue(300);
  const farthest = useSharedValue(0);
  const fullSwipe = useRef(false);

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
    </Animated.View>
  );

  const pressable = onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${name}, ${m.label}, ${plainTimeLabel(daysLeft)}`}
      accessibilityHint={accessibilityHint ?? 'Opens the character'}
      accessibilityActions={onRemove ? [{ name: 'remove', label: 'Remove' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'remove') onRemove?.();
      }}
      onPress={() => {
        // Tapping a row (or any row) closes whichever row is open.
        if (openRow && openRow !== swipeRef.current) {
          closeOpenRow();
          return;
        }
        if (openRow === swipeRef.current && openRow) {
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
  ) : (
    body
  );

  if (!onRemove) return <View style={styles.wrap}>{pressable}</View>;

  function remove() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openRow = null;
    onRemove?.();
  }

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
  wrap: { marginBottom: 8 },
  opaque: { backgroundColor: colors.bg, borderRadius: 16 },
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
  text: { flex: 1, gap: 2 },
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
