import * as ImagePicker from 'expo-image-picker';

import type { UploadFile } from './api';

/**
 * Opens the system photo picker and returns the chosen image ready for
 * `upload()`, or null if the user cancelled.
 */
export async function pickImage(options: { square?: boolean; quality?: number } = {}): Promise<UploadFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: options.square,
    aspect: options.square ? [1, 1] : undefined,
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
