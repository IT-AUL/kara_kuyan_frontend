import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { retryFailedSheets, useSyncState } from '@/data/syncState';
import {
  AppIcon,
  type AppIconName,
  Card,
  colors,
  fontFamilies,
  hairline,
  Screen,
  spacing,
  StatusPill,
  textStyles,
  touchTarget,
} from '@/design-system';

import { SyncSummary } from './components/SyncSummary';
import { SyncWorkRow, type SyncWorkStatus } from './components/SyncWorkRow';

type MenuItem = {
  icon: AppIconName;
  title: string;
  route: '/classes' | '/assignments' | '/export-gradebook' | '/analytics';
};

const MENU_ITEMS: readonly MenuItem[] = [
  { icon: 'classes', title: 'Классы и ученики', route: '/classes' },
  { icon: 'library', title: 'Все тесты', route: '/assignments' },
  { icon: 'export', title: 'Экспорт в журнал', route: '/export-gradebook' },
  { icon: 'analytics', title: 'Аналитика', route: '/analytics' },
];

export function MoreScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const { rows, counts } = useSyncState();

  const lastSentAt = useMemo<number | null>(() => {
    let max: number | null = null;
    for (const r of rows) {
      if (r.entry.status === 'synced') {
        if (max === null || r.submission.savedAt > max) {
          max = r.submission.savedAt;
        }
      }
    }
    return max;
  }, [rows]);

  const recentWorks = useMemo(() => {
    const groups = new Map<
      string,
      {
        assignmentId: string;
        total: number;
        sent: number;
        hasFailed: boolean;
        hasWaiting: boolean;
        maxSavedAt: number;
      }
    >();

    for (const r of rows) {
      const id = r.submission.assignmentId;
      const existing = groups.get(id) ?? {
        assignmentId: id,
        total: 0,
        sent: 0,
        hasFailed: false,
        hasWaiting: false,
        maxSavedAt: r.submission.savedAt,
      };
      existing.total += 1;
      if (r.entry.status === 'synced') {
        existing.sent += 1;
      } else if (r.entry.status === 'failed') {
        existing.hasFailed = true;
      } else {
        existing.hasWaiting = true;
      }
      if (r.submission.savedAt > existing.maxSavedAt) {
        existing.maxSavedAt = r.submission.savedAt;
      }
      groups.set(id, existing);
    }

    return [...groups.values()]
      .sort((a, b) => b.maxSavedAt - a.maxSavedAt)
      .slice(0, 3)
      .map((g) => {
        const status: SyncWorkStatus = g.hasFailed
          ? 'failed'
          : g.hasWaiting
            ? 'waiting'
            : 'sent';
        const title =
          ctx.tests.find((t) => t.testId === g.assignmentId)?.title ?? 'Работа';
        return {
          assignmentId: g.assignmentId,
          title,
          total: g.total,
          sent: g.sent,
          status,
        };
      });
  }, [rows, ctx]);

  return (
    <Screen edges={['top']}>
      <Text selectable style={textStyles.display}>
        Ещё
      </Text>

      <SyncSummary
        counts={counts}
        lastSentAt={lastSentAt}
        onRetry={() => void retryFailedSheets()}
      />

      {recentWorks.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Последние работы</Text>
          <Card style={styles.listCard}>
            {recentWorks.map((work, index) => (
              <SyncWorkRow
                isLast={index === recentWorks.length - 1}
                key={work.assignmentId}
                sent={work.sent}
                status={work.status}
                title={work.title}
                total={work.total}
              />
            ))}
          </Card>
        </View>
      ) : null}

      <Card style={styles.listCard}>
        {MENU_ITEMS.map((item, index) => {
          const isLast = index === MENU_ITEMS.length - 1;
          return (
            <Pressable
              accessibilityLabel={item.title}
              accessibilityRole="button"
              key={item.route}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [
                styles.menuRow,
                !isLast && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon color={colors.textMuted} name={item.icon} size={20} />
              <Text style={styles.menuTitle}>{item.title}</Text>
              <AppIcon color={colors.textFaint} name="chevronRight" size={18} />
            </Pressable>
          );
        })}
      </Card>

      <Card style={styles.privacy} tone="raised">
        <StatusPill label="Обработка на устройстве" tone="info" />
        <Text selectable style={textStyles.titleSmall}>
          Приватность
        </Text>
        <Text style={textStyles.bodySmall}>
          Листы учеников не сохраняются и не отправляются: разбор идёт на телефоне. Фото задания из учебника уходит на сервер только с вашего согласия.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  eyebrow: {
    ...textStyles.caption,
    letterSpacing: 1,
    paddingHorizontal: spacing.xxs,
    textTransform: 'uppercase',
  },
  listCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  menuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: Math.max(56, touchTarget),
  },
  menuTitle: {
    ...textStyles.bodySmall,
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.medium,
  },
  pressed: {
    opacity: 0.82,
  },
  privacy: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
});
