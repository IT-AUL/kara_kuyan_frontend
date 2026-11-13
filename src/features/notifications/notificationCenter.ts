import { useSyncExternalStore } from 'react';

import {
  announcementsPort,
  apkInstaller,
  backgroundAnnouncementsWorker,
  kvStore,
  notificationsPort,
  releaseSource,
} from '@/composition';
import {
  buildNotificationFeed,
  deriveLiveFeedEvents,
  parseNotificationPreferences,
  selectNextSystemNotification,
  type FeedItem,
  type FeedViewItem,
  type LiveEventsInput,
  type NotificationChannelId,
  type NotificationPreferences,
} from '@/domain/notifications/feed';
import { isExternalHttpsUrl } from '@/domain/notifications/remote';
import { planUpdate } from '@/domain/update/release';
import type { NotificationPermissionStatus } from '@/ports/notifications';

const KEY_PREFS = 'notifications:prefs:v1';
const KEY_READ = 'notifications:read:v1';
const KEY_DISMISSED = 'notifications:dismissed:v1';
const KEY_NOTIFIED = 'notifications:notified:v1';

function readStringSet(key: string): Set<string> {
  const raw = kvStore.get(key);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writeStringSet(key: string, set: ReadonlySet<string>): void {
  kvStore.set(key, JSON.stringify([...set].slice(-200)));
}

export type NotificationCenterState = {
  permission: NotificationPermissionStatus;
  preferences: NotificationPreferences;
  items: readonly FeedViewItem[];
  unreadCount: number;
  testBannerSentAt: number | null;
  lastSyncedAt: number | null;
  syncingRemote: boolean;
};

let readIds = readStringSet(KEY_READ);
let dismissedIds = readStringSet(KEY_DISMISSED);
let notifiedIds = readStringSet(KEY_NOTIFIED);
let preferences = parseNotificationPreferences(kvStore.get(KEY_PREFS));
let liveEvents: readonly FeedItem[] = [];
let remoteItems: readonly FeedItem[] = announcementsPort.cached();
let lastSyncedAt: number | null = announcementsPort.lastSyncedAt();
let syncingRemote = false;
let availableRelease: { version: string; notes?: string } | null = null;
let bootChecked = false;

function computeSnapshot(
  permission: NotificationPermissionStatus,
  testBannerSentAt: number | null,
): NotificationCenterState {
  const built = buildNotificationFeed(liveEvents, readIds, dismissedIds, remoteItems);
  return {
    permission,
    preferences,
    items: built.items,
    unreadCount: built.unreadCount,
    testBannerSentAt,
    lastSyncedAt,
    syncingRemote,
  };
}

let state: NotificationCenterState = computeSnapshot('undetermined', null);
const listeners = new Set<() => void>();

function emit(nextPermission = state.permission, nextTestSentAt = state.testBannerSentAt): void {
  state = computeSnapshot(nextPermission, nextTestSentAt);
  listeners.forEach((l) => l());
}

function actionRoutesFor(item: FeedItem): Record<string, string> {
  switch (item.categoryId) {
    case 'pack_complete':
      return {
        export_gradebook: item.route ?? '/export-gradebook',
        open_summary: item.secondaryRoute ?? '/assignments',
      };
    case 'sync_failed':
      return { open_sync: item.route ?? '/more' };
    case 'topic_insight':
      return {
        open_analytics: item.route ?? '/analytics',
        open_generator: item.secondaryRoute ?? '/task-generate',
      };
    case 'release_update':
      return { open_news: `/notification-detail?id=${encodeURIComponent(item.id)}` };
    case 'remote_announcement':
      return item.route ? { open_announcement: item.route } : {};
    default:
      return {};
  }
}

async function applyReminderSchedule(): Promise<void> {
  await notificationsPort.syncDailyReminder({
    enabled: preferences.systemEnabled && preferences.afterSchoolReminder,
    hour: preferences.reminderHour,
    minute: preferences.reminderMinute,
    title: 'Кара Куян · итоги учебного дня',
    body: 'Проверьте оставшиеся бланки или отправьте готовые оценки в журнал за пару минут.',
    route: '/checking',
  });
}

async function checkLatestRelease(): Promise<void> {
  try {
    const latest = await releaseSource.latest();
    if (!latest) return;
    const offer = planUpdate(
      latest,
      apkInstaller.currentVersion(),
      await apkInstaller.supportedAbis(),
    );
    if (offer) {
      availableRelease = { version: offer.version, notes: offer.notes };
    }
  } catch {
    // Offline or GitHub unreachable — ignore silently
  }
}

async function maybePresentNextSystemNotification(): Promise<boolean> {
  const perm = await notificationsPort.getPermissionStatus();
  if (perm !== state.permission) {
    emit(perm);
  }
  if (perm !== 'granted') return false;

  // Reload persisted prefs & notified IDs in case headless WorkManager ran while app was backgrounded.
  preferences = parseNotificationPreferences(kvStore.get(KEY_PREFS));
  notifiedIds = readStringSet(KEY_NOTIFIED);

  const releaseEvents = availableRelease
    ? deriveLiveFeedEvents({
        classId: null,
        className: null,
        assignmentId: null,
        assignmentTitle: null,
        checkedCount: 0,
        studentCount: 0,
        outboxCounts: { pending: 0, syncing: 0, synced: 0, failed: 0 },
        topMistake: null,
        availableRelease,
        nowMs: Date.now(),
      })
    : [];

  const candidates = [...liveEvents, ...releaseEvents, ...remoteItems].filter(
    (item) => !dismissedIds.has(item.id),
  );
  const candidate = selectNextSystemNotification(candidates, notifiedIds, preferences);
  if (!candidate) return false;

  notifiedIds = new Set(notifiedIds).add(candidate.id);
  writeStringSet(KEY_NOTIFIED, notifiedIds);

  const detailRoute = `/notification-detail?id=${encodeURIComponent(candidate.id)}`;
  const targetRoute =
    candidate.route && candidate.route !== '/notifications' ? candidate.route : detailRoute;

  await notificationsPort.present({
    id: candidate.id,
    channelId: candidate.channelId,
    categoryId: candidate.categoryId,
    title: candidate.title,
    subtitle: candidate.badge,
    body: candidate.summary,
    route: targetRoute,
    actionRoutes: actionRoutesFor(candidate),
  });
  return true;
}

export const notificationCenter = {
  getState: (): NotificationCenterState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Initializes Android channels/categories, registers WorkManager sync, and pulls remote news (never prompts!). */
  async init(): Promise<void> {
    await notificationsPort.init();
    const perm = await notificationsPort.getPermissionStatus();
    emit(perm);
    void backgroundAnnouncementsWorker.ensureRegistered();

    if (!bootChecked) {
      bootChecked = true;
      await Promise.all([this.refreshRemoteFeed(), checkLatestRelease()]);
      emit();
      await maybePresentNextSystemNotification();
    }
  },

  /** Pulls remote announcements (Backend `/api/v1/announcements` + CDN `announcements.json` with ETag). */
  async refreshRemoteFeed(opts?: { force?: boolean }): Promise<void> {
    if (syncingRemote && !opts?.force) return;
    syncingRemote = true;
    emit();
    try {
      const [res] = await Promise.all([
        announcementsPort.refresh(opts),
        opts?.force ? checkLatestRelease() : Promise.resolve(),
      ]);
      remoteItems = res.items;
      lastSyncedAt = res.syncedAt;
    } finally {
      syncingRemote = false;
      emit();
    }
    await maybePresentNextSystemNotification();
  },

  /** Headless executor invoked by Android WorkManager (`KK_ANNOUNCEMENTS_BACKGROUND_SYNC`) when app is in background. */
  async runBackgroundSync(): Promise<boolean> {
    await notificationsPort.init();
    readIds = readStringSet(KEY_READ);
    dismissedIds = readStringSet(KEY_DISMISSED);
    const [res] = await Promise.all([
      announcementsPort.refresh({ force: true }),
      checkLatestRelease(),
    ]);
    remoteItems = res.items;
    lastSyncedAt = res.syncedAt;
    emit();
    await maybePresentNextSystemNotification();
    return res.fromNetwork || res.items.length > 0;
  },

  async refreshPermission(): Promise<NotificationPermissionStatus> {
    const perm = await notificationsPort.getPermissionStatus();
    emit(perm);
    return perm;
  },

  /** Contextual permission request triggered explicitly by teacher action on the Notifications screen. */
  async requestOptIn(): Promise<NotificationPermissionStatus> {
    const perm = await notificationsPort.requestPermission();
    if (perm === 'granted' && !preferences.systemEnabled) {
      preferences = { ...preferences, systemEnabled: true };
      kvStore.set(KEY_PREFS, JSON.stringify(preferences));
    }
    emit(perm);
    if (perm === 'granted') {
      await applyReminderSchedule();
      await maybePresentNextSystemNotification();
    }
    return perm;
  },

  async openSystemSettings(): Promise<void> {
    await notificationsPort.openSystemSettings();
  },

  openTarget(id: string, target: string, navigateInternal: (route: string) => void): void {
    this.markRead(id);
    if (isExternalHttpsUrl(target)) {
      void notificationsPort.openExternalUrl(target);
    } else {
      navigateInternal(target);
    }
  },

  /** Updates live teacher events and fires at most 1 new deduplicated Android system notification if opted in. */
  async syncLiveState(input: Omit<LiveEventsInput, 'availableRelease' | 'nowMs'>): Promise<void> {
    const nextEvents = deriveLiveFeedEvents({
      ...input,
      availableRelease,
      nowMs: Date.now(),
    });

    const prevSig = liveEvents.map((e) => e.id).join('|');
    const nextSig = nextEvents.map((e) => e.id).join('|');
    liveEvents = nextEvents;
    if (prevSig !== nextSig) {
      emit();
    }

    await maybePresentNextSystemNotification();
  },

  markRead(id: string): void {
    if (readIds.has(id)) return;
    readIds = new Set(readIds).add(id);
    writeStringSet(KEY_READ, readIds);
    emit();
  },

  markAllRead(): void {
    const next = new Set(readIds);
    for (const item of state.items) next.add(item.id);
    readIds = next;
    writeStringSet(KEY_READ, readIds);
    emit();
  },

  dismiss(id: string): void {
    dismissedIds = new Set(dismissedIds).add(id);
    readIds = new Set(readIds).add(id);
    writeStringSet(KEY_DISMISSED, dismissedIds);
    writeStringSet(KEY_READ, readIds);
    emit();
  },

  setSystemEnabled(enabled: boolean): void {
    preferences = { ...preferences, systemEnabled: enabled };
    kvStore.set(KEY_PREFS, JSON.stringify(preferences));
    emit();
    void applyReminderSchedule();
  },

  setChannelEnabled(channelId: NotificationChannelId, enabled: boolean): void {
    preferences = {
      ...preferences,
      channels: { ...preferences.channels, [channelId]: enabled },
    };
    kvStore.set(KEY_PREFS, JSON.stringify(preferences));
    emit();
  },

  setAfterSchoolReminder(enabled: boolean): void {
    preferences = { ...preferences, afterSchoolReminder: enabled };
    kvStore.set(KEY_PREFS, JSON.stringify(preferences));
    emit();
    void applyReminderSchedule();
  },

  /** Fires an instant real Android system notification with interactive action buttons for teacher verification. */
  async sendTestNotification(): Promise<NotificationPermissionStatus> {
    let perm = await notificationsPort.getPermissionStatus();
    if (perm !== 'granted') {
      perm = await this.requestOptIn();
    }
    if (perm !== 'granted') return perm;

    await notificationsPort.present({
      id: `test-banner-${Date.now()}`,
      channelId: 'check_sync',
      categoryId: 'pack_complete',
      title: 'Кара Куян · уведомления подключены',
      subtitle: 'Проверка и синхронизация',
      body: 'Так выглядят важные события: завершение проверки пачки работ класса, свежие анонсы и подсказки по сложным темам.',
      route: '/notifications',
      actionRoutes: {
        export_gradebook: '/export-gradebook',
        open_summary: '/analytics',
      },
    });
    emit(perm, Date.now());
    return perm;
  },
};

// Bind headless Android WorkManager executor at global module scope so background wakeups run even with 0 views mounted.
backgroundAnnouncementsWorker.bindExecutor(() => notificationCenter.runBackgroundSync());

export function useNotificationCenter(): NotificationCenterState {
  return useSyncExternalStore(
    notificationCenter.subscribe,
    notificationCenter.getState,
    notificationCenter.getState,
  );
}
