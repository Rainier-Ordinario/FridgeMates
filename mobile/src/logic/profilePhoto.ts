import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Custom profile photo: picked with square cropping, downscaled to ~400x400, and copied into the
 * app's document directory so it survives force-quits and deleted originals. Never leaves the phone.
 */
export type PickResult =
  { ok: true; uri: string } | { ok: false; reason: 'denied' | 'cancelled' | 'unavailable' | 'failed' };

const PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}profile/`;

async function persist(sourceUri: string): Promise<string> {
  const small = await ImageManipulator.manipulateAsync(sourceUri, [{ resize: { width: 400, height: 400 } }], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true }).catch(() => {});
  const dest = `${PHOTO_DIR}profile-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: small.uri, to: dest });
  return dest;
}

export async function pickProfilePhoto(source: 'library' | 'camera'): Promise<PickResult> {
  try {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    };
    let result: ImagePicker.ImagePickerResult;
    try {
      result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
    if (result.canceled || !result.assets[0]) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: await persist(result.assets[0].uri) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Deletes a stored photo file (ignores missing files). */
export async function deleteProfilePhoto(uri: string | null): Promise<void> {
  if (!uri || !uri.startsWith(PHOTO_DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}
