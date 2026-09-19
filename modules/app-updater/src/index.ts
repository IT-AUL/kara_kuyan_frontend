import { requireNativeModule } from 'expo';

type AppUpdaterModule = {
  supportedAbis(): string[];
  canInstallPackages(): boolean;
  openInstallSettings(): void;
  /** Downloads over https into the app cache, verifies SHA-256, returns the file path; emits `onProgress`. */
  downloadApk(url: string, sha256: string): Promise<string>;
  installApk(path: string): void;
  addListener(event: 'onProgress', listener: (e: { fraction: number }) => void): { remove(): void };
};

export default requireNativeModule<AppUpdaterModule>('AppUpdater');
