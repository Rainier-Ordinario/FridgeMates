import { AVATAR_PRESETS, useSettings, type Avatar } from '@/logic/settings';
import { colors, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { ProfilePicture } from './ProfilePicture';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** "Profile picture": preset grid (food icons on mood circles + the mascot). */
export function ProfileSheet({ visible, onClose }: Props) {
  const settings = useSettings();
  function choose(key: Avatar) {
    Haptics.selectionAsync();
    settings.set('avatar', key);
    settings.set('avatarPhoto', null);
  }
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Profile picture">
      <View style={styles.grid} accessibilityLabel="Preset pictures">
        {AVATAR_PRESETS.map((p) => {
          const selected = !settings.avatarPhoto && settings.avatar === p.key;
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              accessibilityState={{ selected }}
              onPress={() => choose(p.key)}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.8 }]}
            >
              <ProfilePicture size={56} preset={p.key} photo={null} ring={selected} />
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" color={colors.inkMuted} align="center">
        Pick one to show at the top of your overview.
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    justifyContent: 'center',
    paddingVertical: space.sm,
  },
  cell: { alignItems: 'center', justifyContent: 'center' },
});
