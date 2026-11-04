import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import {
  Button,
  colors,
  fontFamilies,
  fontSizes,
  hairline,
  Notice,
  radius,
  Screen,
  ScreenHeader,
  SegmentBar,
  spacing,
  textStyles,
  zoneOf,
} from '@/design-system';
import {
  averageGrade,
  lessonPlan,
  qualityPct,
  sou,
  successPct,
} from '@/domain/analytics/stats';

import { useTestResults } from './data';
import {
  buildReportText,
  formatLessonPlan,
  formatReportDate,
  type ReportInput,
} from './report';

function paperZoneColor(pct: number): string {
  const zone = zoneOf(pct);
  if (zone === 'bad') {
    return '#D23B3B';
  }
  if (zone === 'mid') {
    return '#B7801A';
  }
  return '#14995B';
}

export function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const ctx = useActiveContext();

  const paramId =
    typeof params.id === 'string' && params.id.length > 0 ? params.id : null;
  const assignmentId = paramId ?? ctx.assignmentId;
  const results = useTestResults(assignmentId);
  const { title, analytics, overview, status } = results;

  const rosterCount = ctx.students.length;
  const wroteCount = overview.works.length;
  const grades = overview.grades;

  const reportDate = useMemo(() => {
    const latestCheckedAt = overview.works[0]?.checkedAt;
    if (latestCheckedAt) {
      const parsed = new Date(latestCheckedAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }, [overview.works]);

  const rawQuestions = useMemo(
    () => analytics?.questions ?? [],
    [analytics?.questions],
  );

  const questions = useMemo(
    () =>
      rawQuestions.map((q) => ({
        number: q.number,
        prompt: q.prompt,
        accuracyPct: q.accuracyPct,
        correctCount: Math.max(0, wroteCount - q.wrongAnswers.length),
      })),
    [rawQuestions, wroteCount],
  );

  const plan = useMemo(
    () => formatLessonPlan(lessonPlan(rawQuestions, overview.works)),
    [rawQuestions, overview.works],
  );

  const reportTitle = title ?? ctx.assignmentTitle ?? '—';
  const className = ctx.className ?? '—';
  const teacherName = ctx.profile?.teacherName ?? '—';

  const reportInput: ReportInput = useMemo(
    () => ({
      title: reportTitle,
      className,
      teacherName,
      date: reportDate,
      rosterCount,
      wroteCount,
      grades,
      questions,
      plan,
    }),
    [
      reportTitle,
      className,
      teacherName,
      reportDate,
      rosterCount,
      wroteCount,
      grades,
      questions,
      plan,
    ],
  );

  const quality = qualityPct(grades);
  const succ = successPct(grades);
  const avg = averageGrade(grades);
  const souVal = sou(grades);

  const totalGrades = grades['5'] + grades['4'] + grades['3'] + grades['2'];
  const gradeDenom = totalGrades > 0 ? totalGrades : wroteCount;
  const gradeSharePct = (count: number) =>
    gradeDenom > 0 ? Math.round((count / gradeDenom) * 100) : 0;

  const handleShareText = async () => {
    const message = buildReportText(reportInput);
    try {
      await Share.share({ message });
    } catch {
      // Share sheet dismissed or unavailable
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Button
              accessibilityLabel="Поделиться текстом"
              onPress={() => void handleShareText()}
              title="Поделиться текстом"
              variant="secondary"
            />
          </View>
          <View style={styles.footerItem}>
            <Button
              accessibilityLabel="Ведомость Excel"
              onPress={() => router.push('/export-gradebook')}
              title="Ведомость Excel"
              variant="primary"
            />
          </View>
        </View>
      }
    >
      <ScreenHeader showBack title="Анализ для завуча" />

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

      <View style={styles.paper}>
        <View style={styles.paperHeaderRow}>
          <Text style={styles.brand}>КАРА КУЯН</Text>
          <Text style={styles.dateText}>{formatReportDate(reportDate)}</Text>
        </View>

        <Text style={styles.docTitle}>
          {`Анализ контрольной работы «${reportTitle}»`}
        </Text>
        <Text style={styles.docMeta}>
          {`${className} · ${teacherName} · по списку ${rosterCount}, писали ${wroteCount}`}
        </Text>

        <View style={styles.tilesRow}>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>
              {quality !== null ? `${quality}%` : '—'}
            </Text>
            <Text style={styles.tileLabel}>качество</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>
              {succ !== null ? `${succ}%` : '—'}
            </Text>
            <Text style={styles.tileLabel}>успеваем.</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>
              {avg !== null ? avg.toFixed(1).replace('.', ',') : '—'}
            </Text>
            <Text style={styles.tileLabel}>ср. балл</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>
              {souVal !== null ? `${souVal}%` : '—'}
            </Text>
            <Text style={styles.tileLabel}>СОУ</Text>
          </View>
        </View>

        <View style={styles.segmentSection}>
          <SegmentBar
            height={12}
            segments={[
              { value: grades['5'], color: colors.grade5 },
              { value: grades['4'], color: colors.grade4 },
              { value: grades['3'], color: colors.grade3 },
              { value: grades['2'], color: colors.grade2 },
            ]}
            showCounts={false}
          />
          <View style={styles.gradeLegendRow}>
            {(['5', '4', '3', '2'] as const).map((g) => (
              <Text key={g} style={styles.gradeLegendItem}>
                {`«${g}» — ${grades[g]} (${gradeSharePct(grades[g])}%)`}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>Поэлементный анализ</Text>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableHeaderCell, styles.colNum]}>№</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrompt]}>
              Задание
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colCorrect]}>
              Справились
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colPct]}>%</Text>
          </View>
          {questions.length > 0 ? (
            questions.map((q) => {
              const roundedPct = Math.round(q.accuracyPct);
              return (
                <View key={q.number} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colNum]}>
                    {q.number}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPrompt]}>
                    {q.prompt}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCorrect]}>
                    {q.correctCount}
                  </Text>
                  <Text
                    style={[
                      styles.tableCellPct,
                      styles.colPct,
                      { color: paperZoneColor(q.accuracyPct) },
                    ]}
                  >
                    {`${roundedPct}%`}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptySectionText}>—</Text>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>План коррекции</Text>
          {plan.length > 0 ? (
            plan.map((line, index) => (
              <Text key={`${index + 1}-${line}`} style={styles.planItem}>
                {`${index + 1}. ${line}`}
              </Text>
            ))
          ) : (
            <Text style={styles.emptySectionText}>—</Text>
          )}
        </View>
      </View>

      <Text style={[textStyles.caption, styles.bottomCaption]}>
        Собрано автоматически · можно поправить после копирования
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bottomCaption: {
    textAlign: 'center',
  },
  brand: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  colCorrect: {
    textAlign: 'right',
    width: 76,
  },
  colNum: {
    width: 24,
  },
  colPct: {
    textAlign: 'right',
    width: 44,
  },
  colPrompt: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  dateText: {
    color: colors.paperMuted,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    fontVariant: ['tabular-nums'],
  },
  docMeta: {
    color: colors.paperMuted,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  docTitle: {
    color: colors.background,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.body,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  emptySectionText: {
    color: colors.paperMuted,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
  },
  footerItem: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gradeLegendItem: {
    color: colors.paperMuted,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  gradeLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  paper: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  paperHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planItem: {
    color: colors.background,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    lineHeight: 17,
  },
  sectionBlock: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  sectionHeading: {
    color: colors.background,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.caption,
    marginBottom: 2,
  },
  segmentSection: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  tableCell: {
    color: colors.background,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  tableCellPct: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  tableHeaderCell: {
    color: colors.paperMuted,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
  },
  tableHeaderRow: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  tableRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(0,0,0,0.08)',
    borderBottomWidth: hairline,
    flexDirection: 'row',
    paddingVertical: spacing.xxs,
  },
  tile: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: radius.sm,
    flex: 1,
    gap: 2,
    padding: spacing.xs,
  },
  tileLabel: {
    color: colors.paperMuted,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  tileValue: {
    color: colors.background,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.body,
    fontVariant: ['tabular-nums'],
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
