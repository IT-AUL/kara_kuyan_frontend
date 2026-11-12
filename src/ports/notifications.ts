// Port for Android system notifications & deep-link responses (ADR 0002, ADR 0010).
// UI and domain layers never import `expo-notifications` directly.

import type { NotificationCategoryId, NotificationChannelId } from '@/domain/notifications/feed';

export type { NotificationCategoryId, NotificationChannelId };

export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export type SystemNotificationPayload = {
  id: string;
  channelId: NotificationChannelId;
  categoryId?: NotificationCategoryId;
  title: string;
  subtitle?: string;
  body: string;
  /** Primary route opened when the notification body is tapped. */
  route: string;
  /** Optional map from interactive action button identifier to target route. */
  actionRoutes?: Readonly<Record<string, string>>;
};

export type DailyReminderSpec = {
  enabled: boolean;
  hour: number;
  minute: number;
  title: string;
  body: string;
  route: string;
};

export type NotificationTapEvent = {
  notificationId: string;
  actionIdentifier: string;
  targetRoute: string;
};

export interface NotificationsPort {
  /** Registers Android channels + interactive action categories (must run before permission prompt on Android 13+). */
  init(): Promise<void>;
  getPermissionStatus(): Promise<NotificationPermissionStatus>;
  requestPermission(): Promise<NotificationPermissionStatus>;
  present(payload: SystemNotificationPayload): Promise<void>;
  syncDailyReminder(spec: DailyReminderSpec): Promise<void>;
  onResponse(listener: (event: NotificationTapEvent) => void): () => void;
  openSystemSettings(): Promise<void>;
}
