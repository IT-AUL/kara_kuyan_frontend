import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type DownloadTarget = { url: string; headers: Record<string, string> };

/**
 * Downloads a document (PDF blank, gradebook) into the app cache and opens the system share sheet.
 * Only documents produced by the backend; camera frames never touch the filesystem (ADR 0003).
 */
export async function downloadAndShare(
  target: DownloadTarget,
  filename: string,
  mimeType: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    const saved = await File.downloadFileAsync(target.url, file, { headers: target.headers });
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: 'На этом устройстве нет меню «Поделиться».' };
    await Sharing.shareAsync(saved.uri, { mimeType, dialogTitle: filename });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
