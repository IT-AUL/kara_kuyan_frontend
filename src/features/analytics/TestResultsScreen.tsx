import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import {
  AccuracyBar,
  AppIcon,
  AvatarStack,
  Button,
  Card,
  colors,
  EmptyState,
  fontFamilies,
  fontSizes,
  hairline,
  HeroCard,
  Notice,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentBar,
  spacing,
  Tag,
  textStyles,
} from '@/design-system';
import {
  averageGrade,
  lessonPlan,
  qualityPct,
  sou,
  successPct,
} from '@/domain/analytics/stats';

import { useTestResults } from './data';

export function TestResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const ctx = useActiveContext();

  const paramId = typeof params.id === 'string' && params.id.length > 0 ? params.id : null;
  const assignmentId = paramId ?? ctx.assignmentId;
  const results = useTestResults(assignmentId);
  const { title, analytics, overview, status } = results;

  const g = overview.grades;
  const quality = qualityPct(g);
  const succ = successPct(g);
  const avg = averageGrade(g);
  const souVal = sou(g);

  const questions = analytics?.questions ?? [];
  const planItems = lessonPlan(questions, overview.works);

  const subtitleParts: string[] = [];
  if (ctx.className) {
    subtitleParts.push(ctx.className);
  }
  subtitleParts.push(`сдали ${overview.progress.checked} из ${overview.progress.total}`);

  return (
    <Screen
      footer={
        <Button
          icon="export"
          onPress={() => router.push('/export-gradebook')}
          title="Ведомость"
          variant="secondary"
        />
      }
    >
      <ScreenHeader
        showBack
        subtitle={subtitleParts.join(' · ')}
        title={title ?? ctx.assignmentTitle ?? 'Итоги контрольной'}
      />

      {status === 'offline' ? (
        <Notice message="Нет связи: показаны сохранённые данные" />
      ) : null}
      {status === 'error' ? (
        <Notice
          actionLabel="Повторить"
          message="Не удалось загрузить аналитику."
          onAction={() => void results.refresh()}
          tone="error"
        />
      ) : null}

      {!ctx.classId ? (
        <EmptyState
          body="Добавьте класс и проверьте первую работу, чтобы увидеть итоги контрольной."
          icon="analytics"
          title="Создайте класс, чтобы увидеть аналитику"
        />
      ) : (
        <>
          <HeroCard>
            <View style={styles.heroContent}>
              <View>
                <Text style={[textStyles.eyebrow, styles.eyebrowFaint]}>
                  Качество знаний
                </Text>
                <View style={styles.qualityRow}>
                  <Text style={styles.qualityNumber}>
                    {quality !== null ? quality : '—'}
                  </Text>
                  {quality !== null ? (
                    <Text style={styles.qualityPercent}>%</Text>
                  ) : null}
                </View>
              </View>

              <SegmentBar
                segments={[
                  { value: g['5'], color: colors.grade5, label: '5' },
                  { value: g['4'], color: colors.grade4, label: '4' },
                  { value: g['3'], color: colors.grade3, label: '3' },
                  { value: g['2'], color: colors.grade2, label: '2' },
                ]}
                showCounts
              />

              <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                  <Text style={textStyles.numeric}>
                    {succ !== null ? `${succ}%` : '—'}
                  </Text>
                  <Text style={styles.metricLabel}>успеваемость</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={textStyles.numeric}>
                    {avg !== null ? avg.toFixed(1).replace('.', ',') : '—'}
                  </Text>
                  <Text style={styles.metricLabel}>средний балл</Text>
                </View>
                <View style={styles.metricCol}>
                  <Text style={textStyles.numeric}>
                    {souVal !== null ? `${souVal}%` : '—'}
                  </Text>
                  <Text style={styles.metricLabel}>СОУ</Text>
                </View>
              </View>
            </View>
          </HeroCard>

          <View style={styles.section}>
            <View style={styles.planHeader}>
              <AppIcon color={colors.primary} name="insight" size={18} />
              <Text style={textStyles.titleSmall}>План на следующий урок</Text>
            </View>

            {planItems.length === 0 ? (
              <Text style={textStyles.bodySmall}>Серьёзных пробелов нет</Text>
            ) : (
              <View style={styles.planList}>
                {planItems.map((item) => {
                  if (item.kind === 'class') {
                    const q = questions.find((x) => x.number === item.questionNumber);
                    const totalWrong =
                      q?.wrongAnswers.length ?? item.topAnswer?.count ?? 0;
                    const topAnswerText = item.topAnswer
                      ? item.topAnswer.answer === ''
                        ? 'пусто'
                        : item.topAnswer.answer
                      : null;

                    return (
                      <Card key={`class-${item.questionNumber}`} style={styles.planCard}>
                        <View style={styles.planCardTop}>
                          <Tag icon="classes" label="Всем классом" tone="bad" />
                          <Text style={textStyles.caption}>
                            задание {item.questionNumber}
                          </Text>
                        </View>
                        <Text style={styles.planCardTitle}>
                          Верно только {Math.round(item.accuracyPct)}%
                        </Text>
                        {item.topAnswer && topAnswerText !== null ? (
                          <Text style={textStyles.bodySmall}>
                            Чаще всего пишут «{topAnswerText}» ({item.topAnswer.count} из{' '}
                            {totalWrong})
                          </Text>
                        ) : null}
                      </Card>
                    );
                  }

                  return (
                    <Card key="individual" style={styles.planCard}>
                      <View style={styles.planCardTop}>
                        <Tag
                          icon="person"
                          label={`Лично · ${item.students.length}`}
                          tone="info"
                        />
                      </View>
                      <Text style={styles.planCardTitle}>Консультация после уроков</Text>
                      <AvatarStack
                        names={item.students.map((s) => s.name)}
                        size={28}
                      />
                    </Card>
                  );
                })}
              </View>
            )}
          </View>

          {questions.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Задания" />
              <Card style={styles.tasksCard}>
                {questions.map((q) => (
                  <AccuracyBar
                    caption={q.prompt}
                    key={q.number}
                    label={`Задание ${q.number}`}
                    value={q.accuracyPct}
                  />
                ))}
              </Card>
              <Text style={textStyles.caption}>
                меньше 50% — повторить всем классом · от 80% — усвоено
              </Text>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrowFaint: {
    color: colors.textFaint,
  },
  heroContent: {
    gap: spacing.md,
  },
  metricCol: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  metricsRow: {
    borderTopColor: colors.divider,
    borderTopWidth: hairline,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  planCard: {
    gap: spacing.sm,
  },
  planCardTitle: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.body,
    lineHeight: 22,
  },
  planCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  planList: {
    gap: spacing.sm,
  },
  qualityNumber: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 56,
    fontVariant: ['tabular-nums'],
    lineHeight: 60,
  },
  qualityPercent: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  qualityRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.xxs,
  },
  section: {
    gap: spacing.sm,
  },
  tasksCard: {
    gap: spacing.md,
  },
});
