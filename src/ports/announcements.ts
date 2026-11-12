// Port for universal remote announcements & background delivery (ADR 0002, ADR 0010).
// UI and domain never fetch remote feeds or call WorkManager directly.

import type { FeedItem } from '@/domain/notifications/feed';

export type AnnouncementsSyncResult = {
  items: readonly FeedItem[];
  syncedAt: number | null;
  fromNetwork: boolean;
};

export interface AnnouncementsPort {
  /** Returns cached announcements from SQLite immediately (0 network latency, works 100% offline). */
  cached(): readonly FeedItem[];
  /** Epoch ms of last successful remote check (200 OK or 304 Not Modified), or null if never synced. */
  lastSyncedAt(): number | null;
  /** Pulls backend `/api/v1/announcements` + CDN `announcements.json` (with ETag cache) and updates SQLite. */
  refresh(opts?: { force?: boolean }): Promise<AnnouncementsSyncResult>;
}

export interface BackgroundAnnouncementsWorker {
  /** Binds the headless sync executor at module load time (runs even when no React views are mounted). */
  bindExecutor(executor: () => Promise<boolean>): void;
  /** Ensures the periodic Android WorkManager task is registered (~30 min minimum interval). */
  ensureRegistered(): Promise<void>;
}
