import type { LatestRelease } from '@/domain/update/release';

/** Where releases are published (GitHub Releases). Resolves null when offline or on any error. */
export interface ReleaseSource {
  latest(): Promise<LatestRelease | null>;
  /** Small text asset (SHA256SUMS.txt). */
  text(url: string): Promise<string | null>;
}

/** Android side of an update: device facts, the unknown-sources grant, download + verify, hand-off to the installer. */
export interface ApkInstaller {
  supportedAbis(): Promise<string[]>;
  currentVersion(): string;
  canInstall(): Promise<boolean>;
  openInstallSettings(): Promise<void>;
  /** Downloads to the app cache and verifies SHA-256; rejects on mismatch. Returns the local path. */
  download(url: string, sha256: string, onProgress: (fraction: number) => void): Promise<string>;
  install(path: string): Promise<void>;
}
