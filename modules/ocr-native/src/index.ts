import { requireNativeModule } from 'expo';

export type NativeCameraCapabilities = {
  ready?: boolean;
  hasFlash: boolean;
  torchEnabled: boolean;
  zoomRatio: number;
  maxZoomRatio: number;
  zslSupported: boolean;
  captureMode: string;
};

type OcrNativeModule = {
  info(): Promise<string>;
  selfTest(): Promise<string>;
  benchmark(cells: number, runs: number): Promise<string>;
  sheetTest(runs: number): Promise<string>;
  readFileForDev(relativePath: string, fallbackRotationDegrees: number): Promise<string>;
  captureSheet(): Promise<string>;
  setTorch(enabled: boolean): Promise<boolean>;
  setZoom(ratio: number): Promise<number>;
  getCameraCapabilities(): Promise<NativeCameraCapabilities>;
  /** Opens the system picker, reads the chosen sheet image in native memory; rejects with PICK_CANCELLED on back. */
  pickAndReadSheet(): Promise<string>;
  requestCameraPermission(): Promise<{ granted: boolean }>;
  getCameraPermission(): Promise<{ granted: boolean }>;
};

export default requireNativeModule<OcrNativeModule>('OcrNative');
