import type { Character } from '@/logic/store';
import { colors, moods, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOutUp } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Face } from './Face';

interface Props {
  ghosts: Character[];
  onPress?: (ghost: Character) => void;
}

const lines = [
  'Still here. Take out the trash.',
  'I can wait. I have forever.',
  'Boo. Also, the bin is right there.',
];

/**
 * Expired characters haunt the Fridge screen until tossed: face 72 floating at the
 * right edge with a dashed speech bubble. When tossed they drift up and fade out.
 */
export function GhostLayer({ ghosts, onPress }: Props) {
  if (ghosts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {ghosts.map((g, i) => (
        <Animated.View
          key={g.id}
          entering={FadeIn.duration(400)}
          exiting={FadeOutUp.duration(500)}
          style={[
            styles.ghost,
            {
              top: space.lg + i * 150,
              right: i % 2 === 0 ? 12 : undefined,
              left: i % 2 === 1 ? 12 : undefined,
            },
          ]}
        >
          <View style={styles.bubble}>
            <AppText style={styles.bubbleText}>{lines[i % lines.length]}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ghost of ${g.characterName}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress?.(g);
            }}
            style={styles.face}
          >
            <Face emoji={g.emoji} mood="ghost" size={72} />
            <View style={styles.tag}>
              <AppText variant="caption" color={colors.inkMuted}>
                👻 {g.characterName}
              </AppText>
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  ghost: { position: 'absolute', alignItems: 'center', gap: space.xs, width: 160 },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: moods.ghost.color,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  bubbleText: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20, textAlign: 'center' },
  face: { alignItems: 'center', gap: space.xs },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
});
