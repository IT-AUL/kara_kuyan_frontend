import Constants from 'expo-constants';

import AppUpdater from '../../../modules/app-updater';
import type { ApkInstaller } from '@/ports/app-updater';

export const nativeInstaller: ApkInstaller = {
  supportedAbis: async () => AppUpdater.supportedAbis(),
  currentVersion: () => Constants.expoConfig?.version ?? '0.0.0',
  canInstall: async () => AppUpdater.canInstallPackages(),
  openInstallSettings: async () => AppUpdater.openInstallSettings(),
  async download(url, sha256, onProgress) {
    const sub = AppUpdater.addListener('onProgress', (e) => onProgress(e.fraction));
    try {
      return await AppUpdater.downloadApk(url, sha256);
    } finally {
      sub.remove();
    }
  },
  install: async (path) => AppUpdater.installApk(path),
};
