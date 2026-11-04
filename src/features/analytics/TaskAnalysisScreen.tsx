import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import {
  Card,
  colors,
  EmptyState,
  fontFamilies,
  fontSizes,
  Notice,
  Screen,
  ScreenHeader,
  SectionHeader,
  spacing,
  Tag,
  textStyles,
   type Zone,
  zoneColor,
  zoneOf,
} from '@/design-system';
import { groupWrongAnswers } from '@/domain/analytics/stats';
import { latestPerStudent } from '@/domain/tests/summary';

import { AnswerGroupCard } from './components/AnswerGroupCard';
import { useTestResults } from './data';

const ZONE_LABELS: Record<Zone, string> = {
  bad: 'Повторить всем классом',
  mid: 'Работа в группах',
  ok: 'Усвоено',
};

export function TaskAnalysisScreen() {
  const params = useLocalSearchParams<{ id?: string; q?: string }>();
  const ctx = useActiveContext();

  const paramId = typeof params.id === 'string' && params.id.length > 0 ? params.id : null;
  const assignmentId = paramId ?? ctx.assignmentId;
  const qParam = typeof params.q === 'string' ? Number(params.q) : Number.NaN;

  const results = useTestResults(assignmentId);
  const { analytics, overview, status } = results;

  const question =
    analytics?.questions.find((q) => q.number === qParam) ?? null;

  const headerNumber = question?.number ?? (Number.isFinite(qParam) && qParam > 0 ? qParam : null);
  const headerTitle = headerNumber !== null ? `Задание ${headerNumber}` : 'Задание';

  const latestWorks = latestPerStudent(overview.works);
  const right = question
    ? latestWorks.filter((w) =>
        w.tasks?.some((t) => t.number === question.number && t.correct),
      )
    : [];
  const wrong = question?.wrongAnswers ?? [];
  const groups = groupWrongAnswers(wrong);

  return (
    <Screen>
      <ScreenHeader showBack title={headerTitle} />

      {status === 'offline' ? (
        <Notice message="Нет связи: показаны сохранённые данные" />
      ) : null}
      {status === 'error' ? (
        <Notice
          actionLabel="Повторить"
          message="Не удалось загрузить разбор задания."
          onAction={() => void results.refresh()}
          tone="error"
        />
      ) : null}

      {!question || !analytics ? (
        <EmptyState
          body="Выберите задание из итогов контрольной работы, чтобы увидеть разбор ответов."
          icon="task"
          title="Нет данных по заданию"
        />
      ) : (
        <>
          <View style={styles.introBlock}>
            <Tag
              label={ZONE_LABELS[zoneOf(question.accuracyPct)]}
              tone={zoneOf(question.accuracyPct)}
            />
            <Text style={[textStyles.title, styles.promptText]}>
              {question.prompt}
            </Text>
            <Text style={textStyles.bodySmall}>
              Правильно:{' '}
              <Text style={styles.expectedAnswer}>{question.expectedAnswer}</Text>
            </Text>
          </View>

          <Card style={styles.metricsCard}>
            <View
              style={[
                styles.accuracyCircle,
                { borderColor: zoneColor(question.accuracyPct) },
              ]}
            >
              <Text
                style={[
                  styles.accuracyValue,
                  { color: zoneColor(question.accuracyPct) },
                ]}
              >
                {Math.round(question.accuracyPct)}%
              </Text>
              <Text style={textStyles.caption}>верно</Text>
            </View>

            <View style={styles.metricsList}>
              <View style={styles.metricRow}>
                <Text style={textStyles.bodySmall}>Справились</Text>
                <Text style={styles.metricNumber}>{right.length}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={textStyles.bodySmall}>Ошиблись</Text>
                <Text style={[styles.metricNumber, { color: colors.zoneBad }]}>
                  {wrong.length}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={textStyles.bodySmall}>В среднем по работе</Text>
                <Text style={styles.metricNumber}>
                  {Math.round(analytics.averageScorePct)}%
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader
              action={
                <Text style={textStyles.caption}>{wrong.length} ошибок</Text>
              }
              title="Как ошибались"
            />

            {wrong.length === 0 ? (
              <Card>
                <Text style={textStyles.body}>Все справились</Text>
              </Card>
            ) : (
              <View style={styles.groupsList}>
                {groups.map((group) => (
                  <AnswerGroupCard
                    answer={group.answer}
                    count={group.count}
                    expected={question.expectedAnswer}
                    key={group.answer}
                    names={group.students.map((s) => s.name)}
                    total={wrong.length}
                  />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  accuracyCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 48,
    borderWidth: 8,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  accuracyValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    lineHeight: 30,
  },
  expectedAnswer: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
  },
  groupsList: {
    gap: spacing.sm,
  },
  introBlock: {
    gap: spacing.xs,
  },
  metricNumber: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.bodySmall,
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricsCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metricsList: {
    flex: 1,
    gap: spacing.xs,
  },
  promptText: {
    marginTop: spacing.xxs,
  },
  section: {
    gap: spacing.sm,
  },
});
