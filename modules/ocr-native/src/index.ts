import { requireNativeModule } from 'expo';

type OcrNativeModule = {
  info(): Promise<string>;
  selfTest(): Promise<string>;
  benchmark(cells: number, runs: number): Promise<string>;
  sheetTest(runs: number): Promise<string>;
  captureSheet(): Promise<string>;
  requestCameraPermission(): Promise<{ granted: boolean }>;
  getCameraPermission(): Promise<{ granted: boolean }>;
};

export default requireNativeModule<OcrNativeModule>('OcrNative');
