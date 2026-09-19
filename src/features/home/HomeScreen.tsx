import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { bundleResource, classAnalyticsResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import {
  AssessmentCard,
  Button,
  Card,
  EmptyState,
  ListRow,
  Notice,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, spacing } from '@/design-system/tokens';

export function HomeScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const analytics = useResource(ctx.classId ? classAnalyticsResource(ctx.classId) : null);
  const bundle = useResource(ctx.assignmentId ? bundleResource(ctx.assignmentId) : null);
  const mistakes = (analytics.data?.topMistakes ?? []).filter((m) => m.affectedStudents > 0);
  const top = [...mistakes].sort((a, b) => b.failureRatePct - a.failureRatePct)[0];
  const offline = ctx.classesState.offline || ctx.testsState.offline;

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow="Кара Куян"
        subtitle={ctx.profile?.school ?? ''}
        title={ctx.profile?.teacherName ?? ''}
      />

      {offline ? (
        <Notice actionLabel="Обновить" message="Нет связи с сервером: показаны сохранённые данные." onAction={() => void ctx.refreshAll()} />
      ) : null}

      {ctx.classId && ctx.assignmentId && ctx.assignmentTitle ? (
        <AssessmentCard
          assessment={{
            title: ctx.assignmentTitle,
            topic: `${ctx.tests.find((t) => t.testId === ctx.assignmentId)?.gradeLevel ?? ''} класс`,
            className: ctx.className ?? '',
            reviewCount: 0,
            variantCount: bundle.data?.variants.length ?? 1,
          }}
          onContinue={() => router.push('/checking')}
          progress={{ checkedCount: ctx.progress.checkedCount, studentCount: ctx.progress.studentCount, completionPercent: ctx.progress.percent }}
        />
      ) : (
        <EmptyState
          actionLabel={ctx.classes.length === 0 ? 'Создать класс' : 'Выбрать работу'}
          body="Создайте класс и выберите работу — здесь появится прогресс проверки."
          icon="library"
          onAction={() => router.push(ctx.classes.length === 0 ? '/class-form' : '/assignments')}
          title="Нечего проверять"
        />
      )}

      {top ? (
        <Card style={styles.insightCard} tone="raised">
          <View style={styles.insightHeader}>
            <StatusPill icon="insight" label="Ключевой вывод" tone="info" />
            <Text style={textStyles.caption}>по {ctx.progress.checkedCount} проверенным</Text>
          </View>
          <Text selectable style={textStyles.title}>Рекомендуем повторить: {top.topicName}</Text>
          <Text style={textStyles.bodySmall}>Затронуто учеников: {top.affectedStudents} из {analytics.data?.studentsCount ?? ctx.progress.studentCount}.</Text>
          <Button icon="analytics" onPress={() => router.push('/analytics')} title="Открыть аналитику" variant="secondary" />
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Последние активности" />
        {ctx.submissions.length === 0 ? (
          <Notice message="Проверенных работ пока нет." tone="info" />
        ) : (
          <Card style={styles.recentList}>
            {ctx.submissions.slice(0, 5).map((sub, index, list) => (
              <ListRow
                icon="person"
                isLast={index === list.length - 1}
                key={sub.uuid}
                right={
                  <View style={styles.resultRight}>
                    <Text style={styles.resultText}>{sub.score}/{sub.maxScore}</Text>
                    <StatusPill label={`Оценка ${sub.grade}`} tone="success" />
                  </View>
                }
                subtitle={new Date(sub.checkedAt).toLocaleDateString('ru-RU')}
                title={sub.studentName}
                variant="plain"
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  insightCard: {
    gap: spacing.md,
  },
  insightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentList: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  resultRight: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  resultText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  section: {
    gap: spacing.sm,
  },
});
