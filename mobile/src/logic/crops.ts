import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

/**
 * Thumbnail crops of the scanned photo, one per detected item that came with a `box`.
 * They live in the app's document directory and never leave the phone: nothing here is ever uploaded.
 */

/** [ymin, xmin, ymax, xmax], normalized 0–1000 over the photo (the /scan contract). */
export type Box = [number, number, number, number];

export interface SourcePhoto {
  uri: string;
  /** Pixel size when known (camera / picker give it); otherwise it is read from the file. */
  width?: number;
  height?: number;
}

const CROP_DIR = `${FileSystem.documentDirectory ?? ''}crops/`;
const CROP_SIZE = 160;
/** Extra room around the box so the crop is not tight on the item. */
const PADDING = 0.15;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function sizeOf(photo: SourcePhoto): Promise<{ width: number; height: number }> {
  if (photo.width && photo.height) return Promise.resolve({ width: photo.width, height: photo.height });
  return new Promise((resolve, reject) =>
    Image.getSize(photo.uri, (width, height) => resolve({ width, height }), reject),
  );
}

/**
 * Cuts a padded square around `box` out of the photo, scales it to 160×160 and saves it as a JPEG.
 * Returns the file path, or null when the box is empty or anything fails (the icon is the fallback).
 */
export async function cropItemPhoto(photo: SourcePhoto, box: Box, key: string): Promise<string | null> {
  try {
    const { width: W, height: H } = await sizeOf(photo);
    if (!W || !H) return null;
    const [ymin, xmin, ymax, xmax] = box.map((v) => clamp(v, 0, 1000) / 1000);
    const bw = (xmax - xmin) * W;
    const bh = (ymax - ymin) * H;
    if (bw < 8 || bh < 8) return null;
    const side = Math.floor(Math.min(Math.max(bw, bh) * (1 + PADDING), W, H));
    const cx = ((xmin + xmax) / 2) * W;
    const cy = ((ymin + ymax) / 2) * H;
    const originX = Math.round(clamp(cx - side / 2, 0, W - side));
    const originY = Math.round(clamp(cy - side / 2, 0, H - side));
    const out = await ImageManipulator.manipulateAsync(
      photo.uri,
      [
        { crop: { originX, originY, width: side, height: side } },
        { resize: { width: CROP_SIZE, height: CROP_SIZE } },
      ],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    await FileSystem.makeDirectoryAsync(CROP_DIR, { intermediates: true }).catch(() => {});
    const dest = `${CROP_DIR}crop-${Date.now().toString(36)}-${key}.jpg`;
    await FileSystem.moveAsync({ from: out.uri, to: dest });
    return dest;
  } catch {
    return null;
  }
}

/** Deletes one crop file (ignores anything that is not ours or already gone). */
export async function deleteCrop(path: string | null | undefined): Promise<void> {
  if (!path || !path.startsWith(CROP_DIR)) return;
  await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
}

/** Fridge reset / demo load: every crop goes. */
export async function deleteAllCrops(): Promise<void> {
  await FileSystem.deleteAsync(CROP_DIR, { idempotent: true }).catch(() => {});
}
