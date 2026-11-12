// Pure domain model for Teacher Notifications, Important Events & News/Tips (ADR 0010).
// Privacy invariant (ADR 0003): never include student names, personal IDs, or image data in notifications.

export type NotificationChannelId =
  | 'check_sync'
  | 'class_insights'
  | 'updates_news'
  | 'teacher_tips';

export type NotificationCategoryId =
  | 'pack_complete'
  | 'sync_failed'
  | 'topic_insight'
  | 'release_update';

export type FeedKind = 'event' | 'insight' | 'news' | 'tip';

export type FeedTone = 'ok' | 'warn' | 'err' | 'info';

export type FeedIconKind = 'check' | 'sync' | 'warning' | 'insight' | 'release' | 'tip' | 'news';

export type ChannelMeta = {
  id: NotificationChannelId;
  title: string;
  description: string;
  importance: 'default' | 'low';
};

export const NOTIFICATION_CHANNELS: readonly ChannelMeta[] = [
  {
    id: 'check_sync',
    title: 'Проверка и синхронизация',
    description: 'Завершение проверки класса и статус отправки работ на сервер',
    importance: 'default',
  },
  {
    id: 'class_insights',
    title: 'Подсказки по темам класса',
    description: 'Темы татарского языка, где ошиблись сразу несколько учеников',
    importance: 'default',
  },
  {
    id: 'updates_news',
    title: 'Обновления и новости',
    description: 'Новые версии Кара Куян и важные изменения в работе сканера',
    importance: 'low',
  },
  {
    id: 'teacher_tips',
    title: 'Полезные приёмы и напоминания',
    description: 'Короткие советы по быстрой проверке и вечернее напоминание о работах',
    importance: 'low',
  },
];

export type NotificationPreferences = {
  /** Master toggle once teacher opts into Android notifications. */
  systemEnabled: boolean;
  channels: Readonly<Record<NotificationChannelId, boolean>>;
  /** Optional local daily reminder at 15:30 when unchecked/unsent sheets remain. */
  afterSchoolReminder: boolean;
  reminderHour: number;
  reminderMinute: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  systemEnabled: true,
  channels: {
    check_sync: true,
    class_insights: true,
    updates_news: true,
    teacher_tips: true,
  },
  afterSchoolReminder: false,
  reminderHour: 15,
  reminderMinute: 30,
};

export function parseNotificationPreferences(raw: string | null): NotificationPreferences {
  if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    const ch = parsed.channels ?? ({} as Record<NotificationChannelId, boolean>);
    return {
      systemEnabled: typeof parsed.systemEnabled === 'boolean' ? parsed.systemEnabled : true,
      channels: {
        check_sync: typeof ch.check_sync === 'boolean' ? ch.check_sync : true,
        class_insights: typeof ch.class_insights === 'boolean' ? ch.class_insights : true,
        updates_news: typeof ch.updates_news === 'boolean' ? ch.updates_news : true,
        teacher_tips: typeof ch.teacher_tips === 'boolean' ? ch.teacher_tips : true,
      },
      afterSchoolReminder: typeof parsed.afterSchoolReminder === 'boolean' ? parsed.afterSchoolReminder : false,
      reminderHour: typeof parsed.reminderHour === 'number' ? Math.max(0, Math.min(23, parsed.reminderHour)) : 15,
      reminderMinute: typeof parsed.reminderMinute === 'number' ? Math.max(0, Math.min(59, parsed.reminderMinute)) : 30,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export type FeedItem = {
  id: string;
  kind: FeedKind;
  channelId: NotificationChannelId;
  categoryId?: NotificationCategoryId;
  icon: FeedIconKind;
  tone: FeedTone;
  badge: string;
  title: string;
  summary: string;
  body: string;
  createdAt: number;
  pinned?: boolean;
  /** Whether this item is eligible to fire an Android system notification on first occurrence. */
  systemNotify?: boolean;
  actionLabel?: string;
  route?: string;
  secondaryActionLabel?: string;
  secondaryRoute?: string;
};

export type FeedViewItem = FeedItem & {
  unread: boolean;
};

// Fixed timestamps for curated product news & helpful teacher guides so ordering stays deterministic.
const T_BASE = Date.UTC(2026, 10, 12, 9, 0, 0);

export const CURATED_NEWS_AND_TIPS: readonly FeedItem[] = [
  {
    id: 'news:v0.4.0-cpp-ocr',
    kind: 'news',
    channelId: 'updates_news',
    icon: 'news',
    tone: 'ok',
    badge: 'Новое · 0.4.0',
    title: 'Нативное C++20 ядро OCR v4 и автоповорот камер',
    summary: 'Единый C++-конвейер распознавания татарского почерка, чтение вертикальных EXIF-снимков и защита от бликов.',
    body: 'В версии 0.4.0 подключено эталонное C++20-ядро tatar_ocr_core (модель v4 INT8 + pipeline_spec). Вертикальные фото со всех камер Android автоматически разворачиваются по EXIF, а при блике лампы на одном из угловых маркеров включается резервное выравнивание по контуру листа.',
    createdAt: T_BASE + 4_000,
    pinned: true,
    actionLabel: 'Открыть сканер',
    route: '/scan',
  },
  {
    id: 'news:v0.4.0-zero-touch',
    kind: 'news',
    channelId: 'updates_news',
    icon: 'check',
    tone: 'info',
    badge: 'Обновление проверки',
    title: 'Быстрый поток Zero-Touch и Top-3 подсказки букв',
    summary: 'Чистые бланки сохраняются одним свайпом за 1 секунду, а сомнительные ячейки исправляются в одно касание.',
    body: 'При пороге уверенности τ = 85% около 42% работ класса не требуют ручной вычитки: зелёный баннер позволяет сразу перейти к следующему листу. В остальных работах жёлтым подсвечены лишь 1–2 спорные буквы (Ә, Ө, Ү, Җ, Ң, Һ) с тремя готовыми вариантами ответа.',
    createdAt: T_BASE + 3_000,
    actionLabel: 'Перейти к проверке',
    route: '/checking',
  },
  {
    id: 'news:v0.4.0-analytics-suite',
    kind: 'news',
    channelId: 'updates_news',
    icon: 'insight',
    tone: 'info',
    badge: 'Аналитика',
    title: 'Сводка для завуча, карта тем и сложных букв',
    summary: 'Качество знаний, СОУ, тепловая карта заданий и выгрузка оценок в школьный журнал.',
    body: 'Во вкладке «Аналитика» доступны 7 экранов: динамика успеваемости, проблемные темы класса, карта типичных ошибок в татарских буквах и готовый отчёт для методического объединения или завуча.',
    createdAt: T_BASE + 2_000,
    actionLabel: 'Открыть аналитику',
    route: '/analytics',
    secondaryActionLabel: 'Экспорт в журнал',
    secondaryRoute: '/export-gradebook',
  },
  {
    id: 'tip:camera-glare-posture',
    kind: 'tip',
    channelId: 'teacher_tips',
    icon: 'tip',
    tone: 'info',
    badge: 'Совет · съёмка',
    title: 'Как сканировать пачку из 30 листов за 1,5 минуты',
    summary: 'Держите телефон на высоте 25–30 см параллельно парте — автозахват сработает сам при зелёной рамке.',
    body: 'Положите стопку работ на ровный стол при рассеянном свете. Нажимать кнопку съёмки необязательно: как только все 4 угловых маркера попадут в кадр и резкость стабилизируется, приложение снимет лист автоматически. Проверенный лист просто сдвиньте в сторону.',
    createdAt: T_BASE + 1_000,
  },
  {
    id: 'tip:offline-outbox',
    kind: 'tip',
    channelId: 'teacher_tips',
    icon: 'sync',
    tone: 'info',
    badge: 'Совет · офлайн',
    title: 'Проверка без школьного Wi-Fi',
    summary: 'Сканируйте и оценивайте работы полностью офлайн — очередь отправится сама при появлении связи.',
    body: 'Все изображения бланков разбираются строго в оперативной памяти телефона и никогда не сохраняются на диск. Готовые оценки записываются в локальную очередь SQLite и синхронизируются с сервером автоматически.',
    createdAt: T_BASE,
    actionLabel: 'Статус синхронизации',
    route: '/more',
  },
];

export type LiveEventsInput = {
  classId: string | null;
  className: string | null;
  assignmentId: string | null;
  assignmentTitle: string | null;
  checkedCount: number;
  studentCount: number;
  outboxCounts: {
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
  };
  topMistake?: {
    topicCode: string;
    topicName: string;
    affectedStudents: number;
    failureRatePct: number;
  } | null;
  availableRelease?: {
    version: string;
    notes?: string;
  } | null;
  nowMs: number;
};

/**
 * Derives privacy-safe live teacher events from current app state.
 * Never includes individual student names or grades (ADR 0003 / ADR 0010).
 */
export function deriveLiveFeedEvents(input: LiveEventsInput): readonly FeedItem[] {
  const events: FeedItem[] = [];
  const {
    classId,
    className,
    assignmentId,
    assignmentTitle,
    checkedCount,
    studentCount,
    outboxCounts,
    topMistake,
    availableRelease,
    nowMs,
  } = input;

  if (availableRelease?.version) {
    events.push({
      id: `news:release:${availableRelease.version}`,
      kind: 'news',
      channelId: 'updates_news',
      categoryId: 'release_update',
      icon: 'release',
      tone: 'ok',
      badge: `Версия ${availableRelease.version}`,
      title: `Доступно обновление Кара Куян ${availableRelease.version}`,
      summary: 'Вышла свежая сборка приложения. Проверьте список улучшений и установите обновление.',
      body:
        availableRelease.notes?.trim() ||
        `Версия ${availableRelease.version} готова к скачиванию и проверена по SHA-256.`,
      createdAt: nowMs + 30,
      pinned: true,
      systemNotify: true,
      actionLabel: 'Что нового',
      route: '/notifications',
    });
  }

  if (outboxCounts.failed > 0) {
    events.push({
      id: `event:sync-failed:${outboxCounts.failed}`,
      kind: 'event',
      channelId: 'check_sync',
      categoryId: 'sync_failed',
      icon: 'warning',
      tone: 'err',
      badge: 'Требует внимания',
      title: `Не отправлено работ: ${outboxCounts.failed}`,
      summary: 'Оценки надёжно сохранены на телефоне, но сервер не принял отправку.',
      body: 'Проверьте подключение к интернету и нажмите «Повторить отправку» во вкладке «Ещё», чтобы синхронизировать результаты.',
      createdAt: nowMs + 20,
      pinned: true,
      systemNotify: true,
      actionLabel: 'Открыть синхронизацию',
      route: '/more',
    });
  }

  if (classId && assignmentId && studentCount > 0 && checkedCount >= studentCount) {
    const cls = className || 'класса';
    const work = assignmentTitle || 'текущей работе';
    events.push({
      id: `event:pack-complete:${classId}:${assignmentId}:${studentCount}`,
      kind: 'event',
      channelId: 'check_sync',
      categoryId: 'pack_complete',
      icon: 'check',
      tone: 'ok',
      badge: 'Пачка проверена',
      title: `Класс ${cls} проверен полностью (${checkedCount}/${studentCount})`,
      summary: `Все работы по «${work}» проверены — ведомость готова к выгрузке в журнал.`,
      body: `Проверено ${checkedCount} из ${studentCount} бланков по работе «${work}». Вы можете сразу экспортировать оценки для электронного журнала или посмотреть общие итоги класса.`,
      createdAt: nowMs + 10,
      systemNotify: true,
      actionLabel: 'Экспорт в журнал',
      route: '/export-gradebook',
      secondaryActionLabel: 'Итоги работы',
      secondaryRoute: `/test-detail?id=${encodeURIComponent(assignmentId)}`,
    });
  }

  if (
    classId &&
    checkedCount >= 3 &&
    topMistake &&
    topMistake.affectedStudents >= 3 &&
    topMistake.failureRatePct >= 40
  ) {
    const cls = className || 'классе';
    const pct = Math.round(topMistake.failureRatePct);
    events.push({
      id: `insight:topic:${classId}:${topMistake.topicCode}`,
      kind: 'insight',
      channelId: 'class_insights',
      categoryId: 'topic_insight',
      icon: 'insight',
      tone: 'warn',
      badge: `Подсказка · ${cls}`,
      title: `Тема для повторения: «${topMistake.topicName}»`,
      summary: `В ${cls} ошиблись ${topMistake.affectedStudents} уч. (${pct}% ошибок) на базе ${checkedCount} проверенных работ.`,
      body: `Тема «${topMistake.topicName}» вызывает системные ошибки у класса (${topMistake.affectedStudents} уч., ${pct}%). Откройте аналитику для разбора типичных позиций или сгенерируйте короткую разминку на следующий урок.`,
      createdAt: nowMs,
      systemNotify: true,
      actionLabel: 'Разобрать в аналитике',
      route: '/analytics',
      secondaryActionLabel: 'Собрать разминку',
      secondaryRoute: '/task-generate',
    });
  }

  return events;
}

export function buildNotificationFeed(
  liveEvents: readonly FeedItem[],
  readIds: ReadonlySet<string>,
  dismissedIds: ReadonlySet<string>,
): {
  items: readonly FeedViewItem[];
  unreadCount: number;
} {
  const merged = [...liveEvents, ...CURATED_NEWS_AND_TIPS].filter((item) => !dismissedIds.has(item.id));
  const sorted = [...merged].sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.createdAt - a.createdAt;
  });

  let unreadCount = 0;
  const items = sorted.map<FeedViewItem>((item) => {
    const unread = !readIds.has(item.id);
    if (unread) unreadCount += 1;
    return { ...item, unread };
  });

  return { items, unreadCount };
}

/**
 * Selects at most ONE new system notification per cycle (Android 15 Notification Cooldown friendly),
 * respecting master and per-channel teacher preferences and never repeating already-notified event IDs.
 */
export function selectNextSystemNotification(
  liveEvents: readonly FeedItem[],
  notifiedIds: ReadonlySet<string>,
  preferences: NotificationPreferences,
): FeedItem | null {
  if (!preferences.systemEnabled) return null;
  for (const item of liveEvents) {
    if (!item.systemNotify) continue;
    if (notifiedIds.has(item.id)) continue;
    if (!preferences.channels[item.channelId]) continue;
    return item;
  }
  return null;
}
