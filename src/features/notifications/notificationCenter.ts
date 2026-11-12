import { useSyncExternalStore } from 'react';

import { apkInstaller, kvStore, notificationsPort, releaseSource } from '@/composition';
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
};

let readIds = readStringSet(KEY_READ);
let dismissedIds = readStringSet(KEY_DISMISSED);
let notifiedIds = readStringSet(KEY_NOTIFIED);
let preferences = parseNotificationPreferences(kvStore.get(KEY_PREFS));
let liveEvents: readonly FeedItem[] = [];
let availableRelease: { version: string; notes?: string } | null = null;
let bootChecked = false;

function computeSnapshot(
  permission: NotificationPermissionStatus,
  testBannerSentAt: number | null,
): NotificationCenterState {
  const built = buildNotificationFeed(liveEvents, readIds, dismissedIds);
  return {
    permission,
    preferences,
    items: built.items,
    unreadCount: built.unreadCount,
    testBannerSentAt,
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
      return { open_news: '/notifications' };
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

export const notificationCenter = {
  getState: (): NotificationCenterState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Initializes Android channels/categories and refreshes permission + GitHub Release news (never prompts!). */
  async init(): Promise<void> {
    await notificationsPort.init();
    const perm = await notificationsPort.getPermissionStatus();
    emit(perm);

    if (!bootChecked) {
      bootChecked = true;
      try {
        const latest = await releaseSource.latest();
        if (latest) {
          const offer = planUpdate(latest, apkInstaller.currentVersion(), await apkInstaller.supportedAbis());
          if (offer) {
            availableRelease = { version: offer.version, notes: offer.notes };
            emit();
          }
        }
      } catch {
        // Offline or GitHub unreachable — ignore silently
      }
    }
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
    }
    return perm;
  },

  async openSystemSettings(): Promise<void> {
    await notificationsPort.openSystemSettings();
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

    if (state.permission !== 'granted') return;
    const candidate = selectNextSystemNotification(liveEvents, notifiedIds, preferences);
    if (!candidate) return;

    notifiedIds.add(candidate.id);
    writeStringSet(KEY_NOTIFIED, notifiedIds);

    await notificationsPort.present({
      id: candidate.id,
      channelId: candidate.channelId,
      categoryId: candidate.categoryId,
      title: candidate.title,
      subtitle: candidate.badge,
      body: candidate.summary,
      route: candidate.route ?? '/notifications',
      actionRoutes: actionRoutesFor(candidate),
    });
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
      body: 'Так выглядят важные события: завершение проверки пачки работ класса, подсказки по сложным темам и статус отправки.',
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

export function useNotificationCenter(): NotificationCenterState {
  return useSyncExternalStore(
    notificationCenter.subscribe,
    notificationCenter.getState,
    notificationCenter.getState,
  );
}
