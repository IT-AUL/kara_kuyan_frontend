import OcrNative from '../../../modules/ocr-native';
import type { SheetEvidence } from '@/domain/ocr/evidence';
import type { OcrEngine, OcrSession } from '@/ports/ocr-engine';
import { alignmentBus } from './alignmentBus';

class NativeSession implements OcrSession {
  onAlignment = alignmentBus.subscribe;

  async captureSheet(): Promise<SheetEvidence> {
    return JSON.parse(await OcrNative.captureSheet()) as SheetEvidence;
  }

  async close(): Promise<void> {}
}

export const nativeOcrEngine: OcrEngine = {
  async ensureCameraPermission() {
    if ((await OcrNative.getCameraPermission()).granted) return true;
    return (await OcrNative.requestCameraPermission()).granted;
  },
  async openSession() {
    return new NativeSession();
  },
};
