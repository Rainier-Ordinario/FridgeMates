import { deleteProfilePhoto, pickProfilePhoto } from '@/logic/profilePhoto';
import { AVATAR_PRESETS, useSettings, type Avatar } from '@/logic/settings';
import { colors, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { SecondaryButton } from './Buttons';
import { UiIcon } from './FoodIcon';
import { useNudge } from './NudgeBanner';
import { ProfilePicture } from './ProfilePicture';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** "Profile picture": preset grid (food icons on mood circles + the mascot). */
export function ProfileSheet({ visible, onClose }: Props) {
  const settings = useSettings();
  const { showToast } = useNudge();
  const [busy, setBusy] = useState(false);

  function choose(key: Avatar) {
    Haptics.selectionAsync();
    const old = settings.avatarPhoto;
    settings.set('avatar', key);
    settings.set('avatarPhoto', null);
    void deleteProfilePhoto(old);
  }

  async function pick(source: 'library' | 'camera') {
    Haptics.selectionAsync();
    setBusy(true);
    const res = await pickProfilePhoto(source);
    setBusy(false);
    if (res.ok) {
      const old = settings.avatarPhoto;
      settings.set('avatarPhoto', res.uri);
      void deleteProfilePhoto(old);
      return;
    }
    if (res.reason === 'denied')
      showToast(
        source === 'camera'
          ? 'Allow the camera for FridgeMates in iOS Settings.'
          : 'Allow Photos for FridgeMates in iOS Settings.',
      );
    else if (res.reason === 'unavailable') showToast('No camera here. Try your photo library.');
    else if (res.reason === 'failed') showToast("That photo didn't work. Try another one.");
  }

  function removePhoto() {
    Haptics.selectionAsync();
    const old = settings.avatarPhoto;
    settings.set('avatarPhoto', null);
    void deleteProfilePhoto(old);
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
      <View style={styles.photoButtons}>
        <SecondaryButton
          icon={<UiIcon icon="framed-picture" size={20} />}
          label={busy ? 'Opening…' : 'Choose from library'}
          onPress={() => void pick('library')}
        />
        <SecondaryButton
          icon={<UiIcon icon="camera" size={20} />}
          label="Take a photo"
          onPress={() => void pick('camera')}
        />
        {settings.avatarPhoto && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            onPress={removePhoto}
            style={({ pressed }) => [styles.remove, pressed && { opacity: 0.7 }]}
          >
            <AppText variant="bodyBold" color={colors.dangerStrong}>
              Remove photo
            </AppText>
          </Pressable>
        )}
      </View>
      <AppText variant="caption" color={colors.inkMuted} align="center">
        Your photo stays on this phone.
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
  photoButtons: { gap: space.sm, paddingTop: space.sm },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
