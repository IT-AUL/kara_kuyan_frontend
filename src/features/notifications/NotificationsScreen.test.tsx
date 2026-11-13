import type { FeedViewItem } from '@/domain/notifications/feed';

import { NotificationArticleView } from './NotificationDetailScreen';
import { FeedRow } from './NotificationsScreen';

jest.mock('./notificationCenter', () => ({
  notificationCenter: {
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    dismiss: jest.fn(),
    openTarget: jest.fn(),
    refreshRemoteFeed: jest.fn(),
    requestOptIn: jest.fn(),
    openSystemSettings: jest.fn(),
    setSystemEnabled: jest.fn(),
    setChannelEnabled: jest.fn(),
    setAfterSchoolReminder: jest.fn(),
    sendTestNotification: jest.fn(),
  },
  useNotificationCenter: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const View = jest.requireActual('react-native').View;
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
  };
});

jest.mock('expo-symbols', () => {
  const View = jest.requireActual('react-native').View;
  return {
    SymbolView: () => <View />,
  };
});

jest.mock('react-native-reanimated', () => {
  const View = jest.requireActual('react-native').View;
  return {
    __esModule: true,
    default: { View },
    Easing: {
      cubic: (t: number) => t,
      out: (fn: unknown) => fn,
    },
    ZoomIn: { duration: () => ({}) },
  };
});

type ElementLike = {
  type?: unknown;
  props?: {
    accessibilityLabel?: string;
    onPress?: () => void;
    children?: unknown;
    header?: unknown;
    footer?: unknown;
  };
};

function isFunctionComponent(type: unknown): type is (props: unknown) => unknown {
  return (
    typeof type === 'function' &&
    !(type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent
  );
}

function collectElements(node: unknown): ElementLike[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectElements);
  const el = node as ElementLike;
  if (isFunctionComponent(el.type)) {
    return collectElements(el.type(el.props ?? {}));
  }
  return [
    el,
    ...collectElements(el.props?.header),
    ...collectElements(el.props?.children),
    ...collectElements(el.props?.footer),
  ];
}

function collectTexts(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (typeof node === 'number') return [String(node)];
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectTexts);
  const el = node as ElementLike;
  if (isFunctionComponent(el.type)) {
    return collectTexts(el.type(el.props ?? {}));
  }
  return [
    ...collectTexts(el.props?.header),
    ...collectTexts(el.props?.children),
    ...collectTexts(el.props?.footer),
  ];
}

const sampleItem: FeedViewItem = {
  id: 'news:v0.4.2-camera',
  kind: 'news',
  channelId: 'updates_news',
  icon: 'news',
  tone: 'ok',
  badge: 'Обновление · 0.4.2',
  title: 'Чёткий сканер почерка 0.4.2 и оптика 1.4×',
  summary: 'Зум 1.4×, подсветка «Свет» и активный автофокус для точного чтения бланков с камеры.',
  body: [
    'Полный развёрнутый абзац статьи, который не должен засорять список уведомлений.',
    '',
    '### Главные изменения',
    '- Режим 1.4× убирает тень телефона.',
    '- Подсветка «Свет» повышает чёткость букв.',
    '',
    '> Совет: держите телефон на высоте 35 см.',
  ].join('\n'),
  createdAt: Date.UTC(2026, 10, 13, 9, 0, 0),
  unread: true,
  actionLabel: 'Открыть сканер',
  route: '/scan',
  secondaryActionLabel: 'Аналитика класса',
  secondaryRoute: '/analytics',
};

describe('Compact Notification Feed & Full Article Reader', () => {
  it('renders only brief badge, title, and teaser in FeedRow without dumping full body or CTA buttons', () => {
    const onOpen = jest.fn();
    const rowTree = FeedRow({ item: sampleItem, isLast: false, onOpen });

    const texts = collectTexts(rowTree).join(' ');
    expect(texts).toContain('Обновление · 0.4.2');
    expect(texts).toContain('Чёткий сканер почерка 0.4.2 и оптика 1.4×');
    expect(texts).toContain('Зум 1.4×, подсветка «Свет» и активный автофокус');
    expect(texts).not.toContain('Полный развёрнутый абзац статьи');
    expect(texts).not.toContain('Открыть сканер');

    const elements = collectElements(rowTree);
    const pressable = elements.find((e) =>
      e.props?.accessibilityLabel?.includes('Чёткий сканер почерка 0.4.2'),
    );
    expect(pressable).toBeDefined();
    pressable?.props?.onPress?.();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders full structured article blocks, CTA footer, and dismiss action in NotificationArticleView', () => {
    const onBack = jest.fn();
    const onDismiss = jest.fn();
    const onNavigate = jest.fn();

    const detailTree = NotificationArticleView({
      item: sampleItem,
      onBack,
      onDismiss,
      onNavigate,
    });

    const texts = collectTexts(detailTree);
    expect(texts).toContain('Обновление · 0.4.2');
    expect(texts).toContain('Чёткий сканер почерка 0.4.2 и оптика 1.4×');
    expect(texts).toContain(
      'Зум 1.4×, подсветка «Свет» и активный автофокус для точного чтения бланков с камеры.',
    );
    expect(texts).toContain(
      'Полный развёрнутый абзац статьи, который не должен засорять список уведомлений.',
    );
    expect(texts).toContain('Главные изменения');
    expect(texts).toContain('Режим 1.4× убирает тень телефона.');
    expect(texts).toContain('Совет: держите телефон на высоте 35 см.');
    expect(texts).toContain('Открыть сканер');
    expect(texts).toContain('Аналитика класса');

    const elements = collectElements(detailTree);
    const hideBtn = elements.find((e) => e.props?.accessibilityLabel === 'Скрыть из ленты');
    hideBtn?.props?.onPress?.();
    expect(onDismiss).toHaveBeenCalledTimes(1);

    const primaryBtn = elements.find((e) => e.props?.accessibilityLabel === 'Открыть сканер');
    primaryBtn?.props?.onPress?.();
    expect(onNavigate).toHaveBeenCalledWith('/scan');
  });
});
