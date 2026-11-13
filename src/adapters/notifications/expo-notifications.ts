import * as Linking from 'expo-linking';
import { requireOptionalNativeModule } from 'expo';
import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/design-system/tokens';
import { NOTIFICATION_CHANNELS } from '@/domain/notifications/feed';
import type {
  DailyReminderSpec,
  NotificationPermissionStatus,
  NotificationTapEvent,
  NotificationsPort,
  SystemNotificationPayload,
} from '@/ports/notifications';

const DAILY_REMINDER_ID = 'kk-daily-after-school-reminder';

type NotificationsModule = typeof NotificationsTypes;

function getNotificationsModule(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (requireOptionalNativeModule('ExpoPushTokenManager') === null) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

let handlerConfigured = false;
let initialized = false;

function ensureForegroundHandler(Notifications: NotificationsModule): void {
  if (handlerConfigured || Platform.OS === 'web') return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Degrade gracefully when native notifications runtime is unavailable
  }
}

function mapPermission(
  Notifications: NotificationsModule,
  res: NotificationsTypes.NotificationPermissionsStatus,
): NotificationPermissionStatus {
  if (res.granted || res.status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (res.canAskAgain === false) return 'denied';
  return 'undetermined';
}

function parseResponse(
  Notifications: NotificationsModule,
  response: NotificationsTypes.NotificationResponse,
): NotificationTapEvent | null {
  const data = (response.notification.request.content.data ?? {}) as {
    route?: string;
    actionRoutes?: Record<string, string>;
  };
  const actionId = response.actionIdentifier || Notifications.DEFAULT_ACTION_IDENTIFIER;
  const customRoute =
    actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER ? data.actionRoutes?.[actionId] : undefined;
  const targetRoute = customRoute ?? data.route;
  if (!targetRoute || typeof targetRoute !== 'string') return null;
  return {
    notificationId: response.notification.request.identifier,
    actionIdentifier: actionId,
    targetRoute,
  };
}

export const expoNotificationsAdapter: NotificationsPort = {
  async init(): Promise<void> {
    if (Platform.OS === 'web' || initialized) return;
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    ensureForegroundHandler(Notifications);

    try {
      if (Platform.OS === 'android') {
        for (const ch of NOTIFICATION_CHANNELS) {
          await Notifications.setNotificationChannelAsync(ch.id, {
            name: ch.title,
            description: ch.description,
            importance:
              ch.importance === 'default'
                ? Notifications.AndroidImportance.DEFAULT
                : Notifications.AndroidImportance.LOW,
            vibrationPattern: ch.importance === 'default' ? [0, 140, 80, 140] : [0, 80],
            lightColor: colors.primary,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }
      }

      await Promise.all([
        Notifications.setNotificationCategoryAsync('pack_complete', [
          {
            identifier: 'export_gradebook',
            buttonTitle: 'В журнал',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'open_summary',
            buttonTitle: 'Итоги',
            options: { opensAppToForeground: true },
          },
        ]),
        Notifications.setNotificationCategoryAsync('sync_failed', [
          {
            identifier: 'open_sync',
            buttonTitle: 'Повторить',
            options: { opensAppToForeground: true },
          },
        ]),
        Notifications.setNotificationCategoryAsync('topic_insight', [
          {
            identifier: 'open_analytics',
            buttonTitle: 'Разобрать',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'open_generator',
            buttonTitle: 'Разминка',
            options: { opensAppToForeground: true },
          },
        ]),
        Notifications.setNotificationCategoryAsync('release_update', [
          {
            identifier: 'open_news',
            buttonTitle: 'Что нового',
            options: { opensAppToForeground: true },
          },
        ]),
        Notifications.setNotificationCategoryAsync('remote_announcement', [
          {
            identifier: 'open_announcement',
            buttonTitle: 'Открыть',
            options: { opensAppToForeground: true },
          },
        ]),
      ]);

      initialized = true;
    } catch {
      // Gracefully ignore when running inside an older dev-client shell
    }
  },

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const Notifications = getNotificationsModule();
    if (!Notifications) return 'denied';
    try {
      const res = await Notifications.getPermissionsAsync();
      return mapPermission(Notifications, res);
    } catch {
      return 'undetermined';
    }
  },

  async requestPermission(): Promise<NotificationPermissionStatus> {
    const Notifications = getNotificationsModule();
    if (!Notifications) return 'denied';
    await this.init();
    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted || existing.status === Notifications.PermissionStatus.GRANTED) return 'granted';
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.granted || requested.status === Notifications.PermissionStatus.GRANTED) return 'granted';
      return requested.canAskAgain === false ? 'denied' : 'undetermined';
    } catch {
      return 'denied';
    }
  },

  async present(payload: SystemNotificationPayload): Promise<void> {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    await this.init();
    const perm = await this.getPermissionStatus();
    if (perm !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: payload.id,
      content: {
        title: payload.title,
        subtitle: payload.subtitle,
        body: payload.body,
        sound: 'default',
        color: colors.primary,
        categoryIdentifier: payload.categoryId,
        data: {
          route: payload.route,
          actionRoutes: payload.actionRoutes ?? {},
        },
      },
      trigger: Platform.OS === 'android' ? { channelId: payload.channelId } : null,
    });
  },

  async syncDailyReminder(spec: DailyReminderSpec): Promise<void> {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    await this.init();
    try {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    } catch {
      // Ignore if not previously scheduled
    }
    if (!spec.enabled) return;
    const perm = await this.getPermissionStatus();
    if (perm !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: spec.title,
        body: spec.body,
        sound: 'default',
        color: colors.primary,
        data: { route: spec.route },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: 'teacher_tips',
        hour: spec.hour,
        minute: spec.minute,
      },
    });
  },

  onResponse(listener: (event: NotificationTapEvent) => void): () => void {
    const Notifications = getNotificationsModule();
    if (!Notifications) return () => undefined;
    ensureForegroundHandler(Notifications);
    let active = true;
    const deliveredKeys = new Set<string>();

    const deliver = (response: NotificationsTypes.NotificationResponse | null | undefined) => {
      if (!active || !response) return;
      const parsed = parseResponse(Notifications, response);
      if (!parsed) return;
      const key = `${parsed.notificationId}:${parsed.actionIdentifier}`;
      if (deliveredKeys.has(key)) return;
      deliveredKeys.add(key);
      listener(parsed);
    };

    try {
      void Notifications.getLastNotificationResponseAsync()
        .then((initial) => deliver(initial))
        .catch(() => undefined);

      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        deliver(response);
      });

      return () => {
        active = false;
        sub.remove();
      };
    } catch {
      return () => undefined;
    }
  },

  async openSystemSettings(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Linking.openURL('app-settings:').catch(() => Linking.openSettings());
  },

  async openExternalUrl(url: string): Promise<void> {
    if (!/^https:\/\//i.test(url)) return;
    await Linking.openURL(url);
  },
};
