import { useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { kvStore } from '@/composition';
import { useActiveContext } from '@/data/context';
import { classAnalyticsResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { retryFailedSheets, useSyncState } from '@/data/syncState';
import { EmptyState, Notice, Screen, textStyles } from '@/design-system';
import { useMotion } from '@/design-system/motion';
import { colors, hairline, radius, spacing } from '@/design-system/tokens';

import { CheckHero } from './components/CheckHero';
import { InsightCard } from './components/InsightCard';
import { Shortcuts } from './components/Shortcuts';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/** Staggered entrance; under reduced motion the content simply appears. */
function Reveal({ index, children }: { index: number; children: ReactNode }) {
  const { reduced, enterMs, staggerMs } = useMotion();
  return <Animated.View entering={reduced ? undefined : FadeInDown.delay(index * staggerMs).duration(enterMs)}>{children}</Animated.View>;
}

function Skeleton({ height }: { height: number }) {
  return <View accessibilityLabel="Загрузка" style={[styles.skeleton, { height }]} />;
}

const dismissKey = (classId: string, topicCode: string) => `insight-dismissed:${classId}:${topicCode}`;

export function HomeScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const analytics = useResource(ctx.classId ? classAnalyticsResource(ctx.classId) : null);
  const { counts } = useSyncState();
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<readonly string[]>([]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([ctx.refreshAll(), analytics.refresh()]);
    setRefreshing(false);
  }, [ctx, analytics]);

  const mistakes = (analytics.data?.topMistakes ?? []).filter((m) => m.affectedStudents > 0);
  const top = [...mistakes].sort((a, b) => b.failureRatePct - a.failureRatePct)[0];
  const insightVisible =
    !!top && !!ctx.classId && ctx.progress.checkedCount > 0 && !dismissed.includes(top.topicCode) && kvStore.get(dismissKey(ctx.classId, top.topicCode)) === null;
  const offline = ctx.classesState.offline || ctx.testsState.offline;
  const loading = ctx.classes.length === 0 && (ctx.classesState.status === 'idle' || ctx.classesState.status === 'loading');
  const test = ctx.tests.find((t) => t.testId === ctx.assignmentId);
  const name = ctx.profile?.teacherName ?? '';
  const rawSchool = ctx.profile?.school?.trim();
  const school = rawSchool && rawSchool !== name.trim() ? rawSchool : undefined;

  const dismissInsight = () => {
    if (!top || !ctx.classId) return;
    kvStore.set(dismissKey(ctx.classId, top.topicCode), '1');
    setDismissed((d) => [...d, top.topicCode]);
  };

  const hero =
    ctx.classId && ctx.assignmentId && ctx.assignmentTitle ? (
      <CheckHero
        assignmentTitle={ctx.assignmentTitle}
        checkedCount={ctx.progress.checkedCount}
        className={ctx.className ?? ''}
        gradeLevel={test?.gradeLevel}
        onOpenTest={() => router.push({ pathname: '/test-detail', params: { id: ctx.assignmentId ?? '' } })}
        onScan={() => router.push('/scan')}
        studentCount={ctx.progress.studentCount}
      />
    ) : (
      <EmptyState
        actionLabel={ctx.classes.length === 0 ? 'Создать класс' : 'Выбрать работу'}
        body={ctx.classes.length === 0 ? 'Создайте первый класс и добавьте учеников.' : 'Выберите работу — здесь появится прогресс проверки.'}
        icon="library"
        onAction={() => router.push(ctx.classes.length === 0 ? '/class-form' : '/assignments')}
        title={ctx.classes.length === 0 ? 'Создайте первый класс' : 'Нечего проверять'}
      />
    );

  return (
    <Screen edges={['top']} onRefresh={() => void refresh()} refreshing={refreshing}>
      <Reveal index={0}>
        <View style={styles.header}>
          <Text style={textStyles.bodySmall}>{greeting()}{school ? ` · ${school}` : ''}</Text>
          <Text accessibilityRole="header" numberOfLines={1} selectable style={textStyles.display}>
            {name}
          </Text>
        </View>
      </Reveal>

      {offline ? (
        <Notice actionLabel="Обновить" message="Нет связи: показаны сохранённые данные." onAction={() => void refresh()} />
      ) : null}
      {ctx.classesState.status === 'error' && ctx.classes.length === 0 ? (
        <Notice actionLabel="Повторить" message="Не удалось загрузить классы." onAction={() => void refresh()} tone="error" />
      ) : null}

      {counts.failed > 0 ? (
        <Notice actionLabel="Повторить" message={`Не отправлено работ: ${counts.failed}. Они сохранены на телефоне.`} onAction={() => void retryFailedSheets()} tone="error" />
      ) : counts.pending + counts.syncing > 0 ? (
        <Notice message={`Отправляется на сервер: ${counts.pending + counts.syncing}.`} tone="info" />
      ) : null}

      {loading ? (
        <Skeleton height={320} />
      ) : (
        <Reveal index={1}>{hero}</Reveal>
      )}

      {insightVisible && top ? (
        <Reveal index={2}>
          <InsightCard
            affected={top.affectedStudents}
            basedOn={ctx.progress.checkedCount}
            onDismiss={dismissInsight}
            onOpen={() => router.push('/analytics')}
            topicName={top.topicName}
            total={analytics.data?.studentsCount ?? ctx.progress.studentCount}
          />
        </Reveal>
      ) : null}

      {ctx.classId ? (
        <Reveal index={3}>
          <Shortcuts studentCount={ctx.progress.studentCount} />
        </Reveal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
  list: { borderColor: colors.divider, borderRadius: radius.lg, borderTopWidth: hairline, paddingTop: spacing.xxs },
  section: { gap: spacing.sm },
  skeleton: { backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.xl, borderWidth: hairline },
});
