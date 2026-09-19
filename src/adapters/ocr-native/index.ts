import OcrNative from '../../../modules/ocr-native';

export type NativeInfo = {
  opencvLoaded: boolean;
  opencvVersion: string | null;
  abi: string | null;
  filesDir: string | null;
};

/** Dev-only lab surface of the native OCR module (spike). The product-facing `OcrEngine` port comes later. */
export const ocrLab = {
  info: async (): Promise<NativeInfo> => JSON.parse(await OcrNative.info()),
  selfTest: async (): Promise<unknown> => JSON.parse(await OcrNative.selfTest()),
  sheetTest: async (runs = 8): Promise<unknown> => JSON.parse(await OcrNative.sheetTest(runs)),
  benchmark: async (cells = 72, runs = 30): Promise<unknown> => JSON.parse(await OcrNative.benchmark(cells, runs)),
};
