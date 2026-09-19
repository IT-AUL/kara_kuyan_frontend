import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { classAnalyticsResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { session } from '@/data/session';
import {
  Button,
  Card,
  EmptyState,
  ListRow,
  MetricTile,
  Notice,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedTabs,
  StatusPill,
  textStyles,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';

const TABS = ['Ученики', 'Выводы'] as const;

export function ClassesScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const [activeTab, setActiveTab] = useState(0);
  const analytics = useResource(ctx.classId ? classAnalyticsResource(ctx.classId) : null);

  if (ctx.classes.length === 0) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader eyebrow="Классы" subtitle={ctx.profile?.school ?? ''} title="Классы" />
        {ctx.classesState.status === 'error' ? (
          <Notice actionLabel="Повторить" message="Не удалось загрузить классы: сервер не ответил." onAction={() => void ctx.classesState.refresh()} tone="error" />
        ) : null}
        <EmptyState
          actionLabel="Создать класс"
          body="Добавьте класс и список учеников — по ним программа узнаёт работы при проверке."
          icon="person"
          onAction={() => router.push('/class-form')}
          title="Пока нет классов"
        />
      </Screen>
    );
  }

  const { progress } = ctx;
  return (
    <Screen edges={['top']}>
      <ScreenHeader eyebrow="Классы" subtitle={ctx.profile?.school ?? ''} title={ctx.className ?? 'Класс'} />

      {ctx.classes.length > 1 ? (
        <SegmentedTabs
          activeIndex={Math.max(ctx.classes.findIndex((c) => c.classId === ctx.classId), 0)}
          onTabChange={(i) => session.selectClass(ctx.classes[i].classId)}
          tabs={ctx.classes.slice(0, 4).map((c) => c.name)}
        />
      ) : null}
      {ctx.rosterState.offline ? <Notice message="Нет связи с сервером: показаны сохранённые данные." /> : null}

      <Card style={styles.classCard}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text selectable style={textStyles.title}>{ctx.assignmentTitle ?? 'Работа не выбрана'}</Text>
            <Text style={textStyles.bodySmall}>{progress.studentCount} учеников</Text>
          </View>
        </View>
        <ProgressBar percent={progress.percent} />
        <View style={styles.metrics}>
          <MetricTile label="Проверено" value={`${progress.checkedCount}`} />
          <MetricTile label="Осталось" value={`${progress.remainingCount}`} />
        </View>
        <Button icon="library" onPress={() => router.push('/assignments')} title="Все тесты" variant="ghost" />
      </Card>

      <SegmentedTabs activeIndex={activeTab} onTabChange={setActiveTab} tabs={TABS} />

      {activeTab === 0 && (
        <View style={styles.section}>
          <Card style={styles.list}>
            {ctx.students.map((student, index) => (
              <ListRow
                icon="person"
                isLast={index === ctx.students.length - 1}
                key={student.studentId}
                subtitle={student.studentId}
                title={student.fullName}
                variant="plain"
              />
            ))}
          </Card>
          <Button
            icon="person"
            onPress={() => router.push({ pathname: '/class-form', params: { classId: ctx.classId ?? '' } })}
            title="Добавить учеников"
            variant="secondary"
          />
          <Button icon="person" onPress={() => router.push('/class-form')} title="Новый класс" variant="ghost" />
        </View>
      )}

      {activeTab === 1 && (
        <View style={styles.section}>
          <SectionHeader title="Выводы" subtitle="По результатам проверенных работ" />
          {analytics.data && analytics.data.topMistakes.some((m) => m.affectedStudents > 0) ? (
            <Card style={styles.insightCard} tone="raised">
              <StatusPill icon="insight" label="Основная сложность" tone="info" />
              <Text selectable style={textStyles.body}>
                {topMistake(analytics.data.topMistakes)}
              </Text>
            </Card>
          ) : (
            <Notice message="Пока мало проверенных работ, чтобы делать выводы." tone="info" />
          )}
        </View>
      )}
    </Screen>
  );
}

function topMistake(mistakes: readonly { topicName: string; affectedStudents: number; failureRatePct: number }[]): string {
  const top = [...mistakes].sort((a, b) => b.failureRatePct - a.failureRatePct)[0];
  return `${top.topicName} — затронуто учеников: ${top.affectedStudents}`;
}

const styles = StyleSheet.create({
  classCard: { gap: spacing.md },
  copy: { flex: 1, gap: spacing.xxs },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  insightCard: { gap: spacing.sm },
  list: { paddingBottom: spacing.xs, paddingTop: spacing.xs },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
});
