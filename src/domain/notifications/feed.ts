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
  | 'release_update'
  | 'remote_announcement';

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
    badge: 'Обновление · 0.4.2',
    title: 'Чёткий сканер почерка 0.4.2 и оптика 1.4×',
    summary: 'Зум 1.4×, подсветка «Свет» и активный автофокус для точного чтения бланков с камеры.',
    body: [
      'В обновлении 0.4.2 мы полностью переработали захват кадра в сканере Кара Куян вместе с эталонным C++20-ядром tatar_ocr_core (точность Top-3 по рукописным бланкам — 99,5%).',
      '',
      '### Что нового в экране сканера',
      '- Кнопка «1.4×» позволяет держать телефон на удобной высоте 35–40 см: лист целиком помещается в кадр 4:3 без размытия краёв и тени от рук.',
      '- Кнопка «Свет» включает мягкую подсветку камеры и автоматически переводит съёмку в режим максимальной детализации.',
      '- Активный автофокус наводится прямо по центру найденного бланка (а также по касанию экрана) и проверяет резкость снимка до запуска нейросети.',
      '- Вертикальные фото из галереи автоматически разворачиваются по EXIF.',
      '',
      '> Совет: если снимаете под яркой настольной лампой, включите 1.4× — тень от телефона исчезнет, а мелкие диакритические элементы букв Ә, Ө, Ү, Җ, Ң, Һ будут видны ещё чётче.',
    ].join('\n'),
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
    badge: 'Проверка',
    title: 'Поток Zero-Touch и Top-3 подсказки букв',
    summary: 'Чистые бланки сохраняются в одно касание, а спорные буквы правятся за секунду.',
    body: [
      'Проверка устроена так, чтобы учитель не тратил время на очевидные клетки и видел только те места, где почерк действительно спорный.',
      '',
      '### Как это экономит время после уроков',
      '- При уверенности модели выше 85% работа попадает в зелёный режим Zero-Touch: нажмите «Сохранить и следующий лист» (или смахните вправо), чтобы сразу перейти к следующему бланку.',
      '- Если ученик написал букву неразборчиво, жёлтым подсвечивается конкретная ячейка и предлагаются 3 наиболее вероятных варианта плюс кнопка «Пусто».',
      '- Для нестандартных исправлений в одно касание открывается полная клавиатура из 39 букв татарского алфавита.',
    ].join('\n'),
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
    summary: 'Готовые показатели СОУ, качества знаний и выгрузка оценок в школьный журнал.',
    body: [
      'После проверки пачки работ приложение автоматически собирает методическую картину по классу без ручного подсчёта в таблицах.',
      '',
      '### Что доступно во вкладке «Аналитика»',
      '- Качество знаний (%), степень обученности учащихся (СОУ) и распределение оценок «5 / 4 / 3 / 2».',
      '- Тепловая карта заданий: сразу видно, какое упражнение вызвало затруднение у половины класса.',
      '- Карта сложных татарских букв и орфограмм для пятиминутной разминки на следующем уроке.',
      '- Готовая сводка для школьного методического объединения или отчёта завучу.',
    ].join('\n'),
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
    summary: 'Три простых приёма, чтобы автозахват срабатывал мгновенно без нажатия кнопки.',
    body: [
      'Сканер Кара Куян умеет снимать бланки автоматически — нажимать кнопку затвора на каждом листе не нужно.',
      '',
      '### Пошаговый порядок для быстрой проверки',
      '1. Положите всю стопку работ на ровный стол у окна или при мягком верхнем свете.',
      '2. Включите в нижней панели сканера режим «1.4×» и держите телефон параллельно парте на высоте около 35 см.',
      '3. Когда все 4 угловых маркера окажутся в кадре, рамка станет зелёной и снимок произойдёт сам — просто сдвиньте верхний лист в сторону.',
      '',
      '> Если бумага ловит блик от лампы, слегка поверните стопку на 5–10 градусов или включите «Свет» в сканере.',
    ].join('\n'),
    createdAt: T_BASE + 1_000,
    actionLabel: 'Попробовать в сканере',
    route: '/scan',
  },
  {
    id: 'tip:offline-outbox',
    kind: 'tip',
    channelId: 'teacher_tips',
    icon: 'sync',
    tone: 'info',
    badge: 'Совет · офлайн',
    title: 'Проверка без школьного Wi-Fi и приватность',
    summary: 'Нейросеть работает прямо на телефоне, а оценки отправляются при появлении сети.',
    body: [
      'Кара Куян спроектирован для реальных школьных кабинетов, где мобильная связь и Wi-Fi могут работать нестабильно.',
      '',
      '### Как устроена офлайн-работа',
      '- Заранее откройте нужный класс и работу: список учеников и ключи ответов сохранятся в локальном кеше телефона.',
      '- Распознавание почерка выполняется на процессоре телефона — кадры с камеры обрабатываются в оперативной памяти и сразу удаляются (принцип Zero-Photo).',
      '- Все выставленные оценки записываются в надёжную очередь SQLite и автоматически синхронизируются с сервером, как только появится интернет.',
    ].join('\n'),
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
  remoteItems: readonly FeedItem[] = [],
): {
  items: readonly FeedViewItem[];
  unreadCount: number;
} {
  const seen = new Set<string>();
  const merged: FeedItem[] = [];
  for (const item of [...liveEvents, ...remoteItems, ...CURATED_NEWS_AND_TIPS]) {
    if (seen.has(item.id) || dismissedIds.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
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
