import * as ImagePicker from 'expo-image-picker';

import type { UploadFile } from './api';

/**
 * Opens the system photo picker and returns the chosen image ready for
 * `upload()`, or null if the user cancelled.
 */
export async function pickImage(
  options: { square?: boolean; aspect?: [number, number]; quality?: number } = {},
): Promise<UploadFile | null> {
  // `square` is shorthand for a 1:1 crop; `aspect` crops to any ratio (e.g. 16:9 covers).
  const aspect = options.aspect ?? (options.square ? ([1, 1] as [number, number]) : undefined);
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: !!aspect,
    aspect,
    quality: options.quality ?? 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const type = asset.mimeType ?? 'image/jpeg';
  return {
    uri: asset.uri,
    type,
    name: asset.fileName ?? `photo.${type.split('/')[1] ?? 'jpg'}`,
    file: asset.file,
  };
}
