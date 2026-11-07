import type { Character } from '@/logic/store';
import { colors, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from './AppText';
import { Face } from './Face';

interface Props {
  ghosts: Character[];
  onPress?: (ghost: Character) => void;
}

/**
 * Expired characters float translucently over the Fridge screen until tossed.
 * Positioned along the right edge so they never cover the list's text.
 */
export function GhostLayer({ ghosts, onPress }: Props) {
  const { width } = useWindowDimensions();
  if (ghosts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {ghosts.map((g, i) => {
        // Zigzag down the screen, alternating sides, so several ghosts don't stack.
        const top = space.lg + i * 130;
        let left = space.sm;
        if (i % 2 === 0) {
          left = width - 96;
        }
        return (
          <Pressable
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={`Ghost of ${g.characterName}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress?.(g);
            }}
            style={[styles.ghost, { top, left }]}
          >
            <Face emoji={g.emoji} mood="ghost" size={72} />
            <View style={styles.tag}>
              <AppText variant="caption" color={colors.inkMuted}>
                👻 {g.characterName}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  ghost: { position: 'absolute', alignItems: 'center', gap: space.xs },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
});
