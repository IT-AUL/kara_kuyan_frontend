/** Pure update logic: which release is newer, which APK fits the phone, what its checksum is. No I/O. */

export type ReleaseAsset = { name: string; url: string; size: number };
export type LatestRelease = { tag: string; notes: string; prerelease: boolean; assets: ReleaseAsset[] };

export type UpdateOffer = {
  version: string;
  notes: string;
  apk: ReleaseAsset;
  /** `SHA256SUMS.txt` asset; absent means the update is not offered (no integrity check possible). */
  checksums: ReleaseAsset;
};

const CHECKSUMS_NAME = 'SHA256SUMS.txt';
const FALLBACK_ABI = 'universal';

/** `v1.2.3` / `1.2.3` → [1, 2, 3]; anything with a suffix (`-rc1`) or a wrong shape → null. */
export function parseVersion(text: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

export function apkName(version: string, abi: string): string {
  return `kara-kuyan-v${version}-${abi}.apk`;
}

/** Decides whether to offer `release` to an app at `currentVersion` running on a phone supporting `abis` (best first). */
export function planUpdate(release: LatestRelease, currentVersion: string, abis: string[]): UpdateOffer | null {
  if (release.prerelease || !isNewer(release.tag, currentVersion)) return null;
  const version = release.tag.replace(/^v/, '');
  const checksums = release.assets.find((a) => a.name === CHECKSUMS_NAME);
  if (!checksums) return null;
  for (const abi of [...abis, FALLBACK_ABI]) {
    const apk = release.assets.find((a) => a.name === apkName(version, abi));
    if (apk) return { version, notes: release.notes, apk, checksums };
  }
  return null;
}

/** Reads a `sha256sum` file (`<hex>  <name>` per line) and returns the lowercase hex for `fileName`. */
export function findChecksum(sums: string, fileName: string): string | null {
  for (const line of sums.split(/\r?\n/)) {
    const m = /^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(line);
    if (m && m[2] === fileName) return m[1].toLowerCase();
  }
  return null;
}
