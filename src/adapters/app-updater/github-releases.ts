import type { ReleaseSource } from '@/ports/app-updater';
import type { LatestRelease } from '@/domain/update/release';

const REPO = 'IT-AUL/kara_kuyan_frontend';
const TIMEOUT_MS = 8000;

async function get(url: string, accept: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: accept }, signal: controller.signal });
    return res.ok ? res : null;
  } catch {
    return null; // offline or GitHub unreachable: the app simply does not offer an update
  } finally {
    clearTimeout(timer);
  }
}

/** Only the fields we use, validated by shape; anything unexpected → no update offered. */
function parse(raw: unknown): LatestRelease | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.tag_name !== 'string' || !Array.isArray(r.assets)) return null;
  const assets = r.assets.flatMap((a: unknown) => {
    const x = a as Record<string, unknown>;
    return typeof x?.name === 'string' && typeof x.browser_download_url === 'string' && typeof x.size === 'number'
      ? [{ name: x.name, url: x.browser_download_url, size: x.size }]
      : [];
  });
  return { tag: r.tag_name, notes: typeof r.body === 'string' ? r.body : '', prerelease: r.prerelease === true, assets };
}

export const githubReleases: ReleaseSource = {
  async latest() {
    const res = await get(`https://api.github.com/repos/${REPO}/releases/latest`, 'application/vnd.github+json');
    if (!res) return null;
    try {
      return parse(await res.json());
    } catch {
      return null;
    }
  },
  async text(url) {
    const res = await get(url, 'text/plain');
    return res ? res.text().catch(() => null) : null;
  },
};
