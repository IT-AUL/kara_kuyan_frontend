import { File, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { parseScanTaskBody, type ScanTaskResult } from '@/adapters/api/backend';

export type PhotoSource = 'camera' | 'library';
export type ScanOutcome =
  | { kind: 'ok'; result: ScanTaskResult }
  | { kind: 'cancelled' }
  | { kind: 'denied' }
  | { kind: 'failed'; message: string };

/**
 * Textbook-exercise photo → `scan-task` (ADR 0009). The system UI takes/picks the photo, the native upload task
 * sends the file, and the temporary file is deleted afterwards. No base64, no bytes in JS.
 * Never used for student sheets.
 */
export async function scanExercisePhoto(
  source: PhotoSource,
  target: { url: string; headers: Record<string, string> },
): Promise<ScanOutcome> {
  let uri: string | null = null;
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { kind: 'denied' };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, exif: false, base64: false };
    const picked = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled || picked.assets.length === 0) return { kind: 'cancelled' };
    uri = picked.assets[0].uri;
    const file = new File(uri);
    const res = await file.upload(target.url, {
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: picked.assets[0].mimeType ?? 'image/jpeg',
      headers: target.headers,
    });
    if (res.status < 200 || res.status >= 300) return { kind: 'failed', message: `HTTP ${res.status}` };
    return { kind: 'ok', result: parseScanTaskBody(res.body) };
  } catch (e) {
    return { kind: 'failed', message: e instanceof Error ? e.message : String(e) };
  } finally {
    if (uri) {
      try {
        new File(uri).delete();
      } catch {
        // the picker's cache copy may already be gone
      }
    }
  }
}
