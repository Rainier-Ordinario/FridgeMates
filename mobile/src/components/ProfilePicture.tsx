import { AVATAR_PRESETS, useSettings, type Avatar } from '@/logic/settings';
import { colors, moods } from '@/theme';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { UiIcon } from './FoodIcon';
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  /** Show the small pencil badge and make it tappable. */
  onPress?: () => void;
  /** Render a specific preset (for the picker grid) instead of the saved one. */
  preset?: Avatar;
  /** Render a specific photo uri instead of the saved one. */
  photo?: string | null;
  ring?: boolean;
  accessibilityLabel?: string;
}

/** The profile picture: custom photo, or a preset (Fluent icon on a mood circle, or the mascot). */
export function ProfilePicture({
  size = 72,
  onPress,
  preset,
  photo,
  ring = false,
  accessibilityLabel,
}: Props) {
  const settings = useSettings();
  const key = preset ?? settings.avatar;
  const uri = photo === undefined ? settings.avatarPhoto : photo;
  const def = AVATAR_PRESETS.find((p) => p.key === key) ?? AVATAR_PRESETS[5];
  const m = moods[def.mood];
  const circle = (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: uri ? colors.surface : m.tint,
          borderColor: ring ? colors.brand : m.color,
          borderWidth: ring ? 3 : 2,
        },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : def.icon ? (
        <UiIcon icon={def.icon} size={Math.round(size * 0.6)} />
      ) : (
        <Image
          source={require('@/assets/mascot/happy.png')}
          style={{ width: size * 0.84, height: size * 0.84 }}
          contentFit="contain"
        />
      )}
    </View>
  );
  if (!onPress)
    return (
      <View accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        {circle}
      </View>
    );
  const badge = Math.max(22, Math.round(size * 0.32));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Change profile picture'}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      {circle}
      <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2 }]}>
        <Svg width={badge * 0.55} height={badge * 0.55} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
            stroke={colors.ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path d="m13.5 6.5 3 3" stroke={colors.ink} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
