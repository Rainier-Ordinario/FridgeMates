import { deleteProfilePhoto, pickProfilePhoto } from '@/logic/profilePhoto';
import { AVATAR_PRESETS, useSettings, type Avatar } from '@/logic/settings';
import { colors, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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

const COLUMNS = 5;
const ROW_GAP = 12;
const CELL = 56;

/** "Profile picture": a 5-column grid of presets plus a "Your photo" cell, and Library / Camera buttons. */
export function ProfileSheet({ visible, onClose }: Props) {
  const settings = useSettings();
  const { showToast } = useNudge();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  // Sheet content is the window minus 24pt gutters on each side.
  const cellWidth = Math.floor((width - 2 * space.xl) / COLUMNS);

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

  const hasPhoto = !!settings.avatarPhoto;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Profile picture">
      <View style={styles.grid} accessibilityLabel="Pictures">
        {AVATAR_PRESETS.map((p) => {
          const selected = !hasPhoto && settings.avatar === p.key;
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              accessibilityState={{ selected }}
              onPress={() => choose(p.key)}
              style={({ pressed }) => [styles.cell, { width: cellWidth }, pressed && { opacity: 0.8 }]}
            >
              <ProfilePicture size={CELL} preset={p.key} photo={null} ring={selected} />
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasPhoto ? 'Your photo' : 'Your photo: choose one from your library'}
          accessibilityState={{ selected: hasPhoto }}
          accessibilityActions={hasPhoto ? [{ name: 'remove', label: 'Remove photo' }] : undefined}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'remove') removePhoto();
          }}
          onPress={() => void pick('library')}
          style={({ pressed }) => [styles.cell, { width: cellWidth }, pressed && { opacity: 0.8 }]}
        >
          {hasPhoto ? (
            <ProfilePicture size={CELL} ring />
          ) : (
            <View style={styles.photoCell}>
              <UiIcon icon="framed-picture" size={22} />
            </View>
          )}
        </Pressable>
      </View>
      <View style={styles.photoButtons}>
        <SecondaryButton
          icon={<UiIcon icon="framed-picture" size={18} />}
          label={busy ? 'Opening…' : 'Library'}
          accessibilityLabel="Choose from library"
          small
          onPress={() => void pick('library')}
          style={styles.photoButton}
        />
        <SecondaryButton
          icon={<UiIcon icon="camera" size={18} />}
          label="Camera"
          accessibilityLabel="Take a photo"
          small
          onPress={() => void pick('camera')}
          style={styles.photoButton}
        />
      </View>
      {hasPhoto && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove photo"
          onPress={removePhoto}
          style={({ pressed }) => [styles.remove, pressed && { opacity: 0.7 }]}
        >
          <AppText style={styles.removeText} color={colors.dangerStrong}>
            Remove photo
          </AppText>
        </Pressable>
      )}
      <AppText variant="caption" color={colors.inkMuted} align="center">
        Your photo stays on this phone.
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: ROW_GAP, paddingVertical: space.xs },
  cell: { alignItems: 'center', justifyContent: 'center', minHeight: CELL },
  photoCell: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtons: { flexDirection: 'row', gap: space.sm, paddingTop: space.xs },
  photoButton: { flex: 1 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20 },
});
