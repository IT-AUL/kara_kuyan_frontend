import { apkName, findChecksum, isNewer, parseVersion, planUpdate, type LatestRelease } from './release';

const asset = (name: string) => ({ name, url: `https://example.test/${name}`, size: 100 });
const release = (over: Partial<LatestRelease> = {}): LatestRelease => ({
  tag: 'v0.2.0',
  notes: 'notes',
  prerelease: false,
  assets: [
    asset('kara-kuyan-v0.2.0-arm64-v8a.apk'),
    asset('kara-kuyan-v0.2.0-armeabi-v7a.apk'),
    asset('kara-kuyan-v0.2.0-universal.apk'),
    asset('SHA256SUMS.txt'),
  ],
  ...over,
});

describe('versions', () => {
  it('parses plain semver only', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion('1.10.0')).toEqual([1, 10, 0]);
    expect(parseVersion('1.2.3-rc1')).toBeNull();
    expect(parseVersion('latest')).toBeNull();
  });

  it('compares numerically, not lexically', () => {
    expect(isNewer('v0.10.0', '0.9.9')).toBe(true);
    expect(isNewer('v0.1.1', '0.1.1')).toBe(false);
    expect(isNewer('v0.1.0', '0.1.1')).toBe(false);
    expect(isNewer('garbage', '0.1.1')).toBe(false);
  });
});

describe('planUpdate', () => {
  it('offers the first ABI the phone supports', () => {
    expect(planUpdate(release(), '0.1.1', ['arm64-v8a', 'armeabi-v7a'])?.apk.name).toBe(apkName('0.2.0', 'arm64-v8a'));
    expect(planUpdate(release(), '0.1.1', ['x86_64', 'armeabi-v7a'])?.apk.name).toBe(apkName('0.2.0', 'armeabi-v7a'));
  });

  it('falls back to the universal APK', () => {
    expect(planUpdate(release(), '0.1.1', ['x86_64'])?.apk.name).toBe(apkName('0.2.0', 'universal'));
  });

  it('offers nothing for old, equal, pre-release or checksum-less releases', () => {
    expect(planUpdate(release(), '0.2.0', ['arm64-v8a'])).toBeNull();
    expect(planUpdate(release({ prerelease: true }), '0.1.1', ['arm64-v8a'])).toBeNull();
    expect(planUpdate(release({ tag: 'v0.3.0-rc1' }), '0.1.1', ['arm64-v8a'])).toBeNull();
    expect(planUpdate(release({ assets: release().assets.filter((a) => a.name !== 'SHA256SUMS.txt') }), '0.1.1', ['arm64-v8a'])).toBeNull();
  });
});

describe('findChecksum', () => {
  const hex = 'a'.repeat(64);
  const other = 'B'.repeat(64);
  const sums = `${hex}  kara-kuyan-v0.2.0-arm64-v8a.apk\r\n${other} *kara-kuyan-v0.2.0-universal.apk\n`;

  it('finds a file, lowercases, ignores binary marker', () => {
    expect(findChecksum(sums, 'kara-kuyan-v0.2.0-arm64-v8a.apk')).toBe(hex);
    expect(findChecksum(sums, 'kara-kuyan-v0.2.0-universal.apk')).toBe('b'.repeat(64));
    expect(findChecksum(sums, 'missing.apk')).toBeNull();
  });
});
