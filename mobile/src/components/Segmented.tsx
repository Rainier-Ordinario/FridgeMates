import { colors, motion, radius } from '@/theme';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';

interface Props {
  options: string[];
  index: number;
  onChange: (index: number) => void;
  accessibilityLabel?: string;
}

/** Compact pill-style segmented switch with an animated indicator (instant under Reduce Motion). */
export function Segmented({ options, index, onChange, accessibilityLabel = 'Page' }: Props) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const segment = width / options.length;
  const x = useSharedValue(0);
  useEffect(() => {
    x.set(reduceMotion ? index * segment : withTiming(index * segment, { duration: motion.fast }));
  }, [index, segment, reduceMotion, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {segment > 0 && <Animated.View style={[styles.indicator, { width: segment }, indicator]} />}
      {options.map((label, i) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: i === index }}
          onPress={() => {
            if (i === index) return;
            Haptics.selectionAsync();
            onChange(i);
          }}
          style={styles.segment}
        >
          <AppText style={styles.label} color={i === index ? colors.ink : colors.inkMuted}>
            {label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 40,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, lineHeight: 18 },
});
