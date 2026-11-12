// Universal Dual-Source Remote Announcements Adapter (ADR 0010):
// 1. Optional backend endpoint `GET /api/v1/announcements` via `ApiClient` (silently ignores 404/405 until deployed).
// 2. GitHub Pages CDN `https://it-aul.github.io/kara_kuyan_frontend/announcements.json` (with ETag `If-None-Match` 304 cache).
// Persists validated feeds in SQLite `KeyValueStore` so news/events remain readable 100% offline.

import type { ApiClient } from '@/adapters/api/client';
import type { FeedItem } from '@/domain/notifications/feed';
import {
  mergeAnnouncementLists,
  parseRemoteAnnouncementsPayload,
} from '@/domain/notifications/remote';
import type { AnnouncementsPort, AnnouncementsSyncResult } from '@/ports/announcements';
import type { KeyValueStore } from '@/ports/key-value';

export const DEFAULT_ANNOUNCEMENTS_CDN_URL =
  'https://it-aul.github.io/kara_kuyan_frontend/announcements.json';

const KEY_RAW_API = 'notifications:remote_raw_api:v1';
const KEY_RAW_CDN = 'notifications:remote_raw_cdn:v1';
const KEY_ETAG_CDN = 'notifications:remote_etag_cdn:v1';
const KEY_SYNCED_AT = 'notifications:remote_synced_at:v1';

const MIN_POLL_INTERVAL_MS = 3 * 60_000;
const CDN_TIMEOUT_MS = 8_000;
const API_TIMEOUT_MS = 6_000;

export type CreateAnnouncementsAdapterOptions = {
  apiClient: ApiClient | null;
  kvStore: KeyValueStore;
  currentVersion: () => string;
  cdnUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

function parseStoredJson(
  rawJson: string | null,
  currentVersion: string,
  nowMs: number,
): readonly FeedItem[] {
  if (!rawJson) return [];
  try {
    return parseRemoteAnnouncementsPayload(JSON.parse(rawJson), { currentVersion, nowMs });
  } catch {
    return [];
  }
}

export function createAnnouncementsAdapter(
  options: CreateAnnouncementsAdapterOptions,
): AnnouncementsPort {
  const fetchFn = options.fetchImpl ?? fetch;
  const nowFn = options.now ?? Date.now;
  const cdnUrl = (options.cdnUrl ?? DEFAULT_ANNOUNCEMENTS_CDN_URL).trim();

  let inFlight: Promise<AnnouncementsSyncResult> | null = null;

  const readLastSyncedAt = (): number | null => {
    const raw = options.kvStore.get(KEY_SYNCED_AT);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const readCachedItems = (nowMs = nowFn()): readonly FeedItem[] => {
    const ver = options.currentVersion();
    const apiItems = parseStoredJson(options.kvStore.get(KEY_RAW_API), ver, nowMs);
    const cdnItems = parseStoredJson(options.kvStore.get(KEY_RAW_CDN), ver, nowMs);
    return mergeAnnouncementLists(apiItems, cdnItems);
  };

  async function fetchBackendAnnouncements(): Promise<boolean> {
    if (!options.apiClient) return false;
    const res = await options.apiClient.request('/api/v1/announcements', (json) => json, {
      timeoutMs: API_TIMEOUT_MS,
    });
    if (res.ok) {
      options.kvStore.set(KEY_RAW_API, JSON.stringify(res.value));
      return true;
    }
    // 404 / 405 means the optional endpoint is not enabled on the backend yet (contract-gaps #33) — clear stale cache silently.
    if (res.error.kind === 'http' && (res.error.status === 404 || res.error.status === 405)) {
      options.kvStore.remove(KEY_RAW_API);
    }
    return false;
  }

  async function fetchCdnAnnouncements(): Promise<boolean> {
    if (!cdnUrl || cdnUrl === 'off' || cdnUrl === 'none') return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CDN_TIMEOUT_MS);
    try {
      const savedEtag = options.kvStore.get(KEY_ETAG_CDN);
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (savedEtag) {
        headers['If-None-Match'] = savedEtag;
      }

      const res = await fetchFn(cdnUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (res.status === 304) {
        return true;
      }
      if (!res.ok) {
        return false;
      }

      const json: unknown = await res.json();
      options.kvStore.set(KEY_RAW_CDN, JSON.stringify(json));
      const nextEtag = res.headers.get('etag') ?? res.headers.get('ETag');
      if (nextEtag) {
        options.kvStore.set(KEY_ETAG_CDN, nextEtag);
      }
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    cached(): readonly FeedItem[] {
      return readCachedItems();
    },

    lastSyncedAt(): number | null {
      return readLastSyncedAt();
    },

    async refresh(opts?: { force?: boolean }): Promise<AnnouncementsSyncResult> {
      const nowMs = nowFn();
      const prevSyncedAt = readLastSyncedAt();
      if (
        !opts?.force &&
        prevSyncedAt !== null &&
        nowMs - prevSyncedAt < MIN_POLL_INTERVAL_MS
      ) {
        return {
          items: readCachedItems(nowMs),
          syncedAt: prevSyncedAt,
          fromNetwork: false,
        };
      }

      if (inFlight) return inFlight;

      inFlight = (async () => {
        try {
          const [apiOk, cdnOk] = await Promise.all([
            fetchBackendAnnouncements(),
            fetchCdnAnnouncements(),
          ]);
          const finishedMs = nowFn();
          const syncedAt = apiOk || cdnOk ? finishedMs : readLastSyncedAt();
          if (apiOk || cdnOk) {
            options.kvStore.set(KEY_SYNCED_AT, String(finishedMs));
          }
          return {
            items: readCachedItems(finishedMs),
            syncedAt,
            fromNetwork: apiOk || cdnOk,
          };
        } finally {
          inFlight = null;
        }
      })();

      return inFlight;
    },
  };
}
