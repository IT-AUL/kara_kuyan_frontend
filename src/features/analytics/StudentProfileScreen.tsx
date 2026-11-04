import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { studentAnalyticsResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import {
  AccuracyBar,
  AppIcon,
  Avatar,
  Card,
  colors,
  DeltaTag,
  EmptyState,
  fontFamilies,
  fontSizes,
  HeroCard,
  Notice,
  Screen,
  ScreenHeader,
  SectionHeader,
  spacing,
  textStyles,
} from '@/design-system';

import { HistoryBars } from './components/HistoryBars';

function formatHistoryLabel(date: string | null, title: string): string {
  if (date && date.trim().length > 0) {
    const trimmed = date.trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoMatch) {
      return `${isoMatch[3]}.${isoMatch[2]}`;
    }
    const dotMatch = /^(\d{2})\.(\d{2})/.exec(trimmed);
    if (dotMatch) {
      return `${dotMatch[1]}.${dotMatch[2]}`;
    }
    return trimmed;
  }
  return title;
}

function chunkIntoRows<T>(items: readonly T[], columns: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    const slice: (T | null)[] = items.slice(i, i + columns);
    while (slice.length < columns) {
      slice.push(null);
    }
    rows.push(slice);
  }
  return rows;
}

export function StudentProfileScreen() {
  const params = useLocalSearchParams<{ id?: string; studentId?: string }>();
  const studentId =
    typeof params.id === 'string' && params.id.length > 0
      ? params.id
      : typeof params.studentId === 'string' && params.studentId.length > 0
        ? params.studentId
        : null;

  const studentRes = useResource(
    studentId ? studentAnalyticsResource(studentId) : null,
  );
  const student = studentRes.data;

  const historyItems = useMemo(() => {
    const history = student?.history ?? [];
    return history.map((h) => ({
      label: formatHistoryLabel(h.date, h.title),
      pct: h.maxScore > 0 ? Math.round((h.score / h.maxScore) * 100) : 0,
    }));
  }, [student]);

  const lastPct =
    historyItems.length > 0 ? historyItems[historyItems.length - 1].pct : null;
  const prevPct =
    historyItems.length >= 2 ? historyItems[historyItems.length - 2].pct : null;
  const deltaValue =
    lastPct !== null && prevPct !== null ? lastPct - prevPct : null;

  const confusedLetters = useMemo(
    () => (student?.problemLetters ?? []).filter((l) => l.confusions.length > 0),
    [student],
  );

  const confusionRows = useMemo(
    () => chunkIntoRows(confusedLetters, 3),
    [confusedLetters],
  );

  const isLoading =
    Boolean(studentId) &&
    (studentRes.status === 'loading' || studentRes.status === 'idle') &&
    !student;

  return (
    <Screen
      onRefresh={studentId ? () => void studentRes.refresh() : undefined}
      refreshing={studentRes.status === 'loading' && Boolean(student)}
    >
      <ScreenHeader showBack title="Профиль ученика" />

      {studentRes.offline ? (
        <Notice message="Нет связи: показаны сохранённые данные" />
      ) : null}
      {studentRes.status === 'error' ? (
        <Notice
          actionLabel="Повторить"
          message="Не удалось загрузить профиль ученика."
          onAction={() => void studentRes.refresh()}
          tone="error"
        />
      ) : null}
      {isLoading ? (
        <Notice message="Загрузка профиля ученика…" tone="info" />
      ) : null}

      {!studentId ? (
        <EmptyState
          body="Выберите ученика в списке класса или в разборе работы."
          icon="person"
          title="Ученик не выбран"
        />
      ) : student ? (
        <>
          <View style={styles.profileHeader}>
            <Avatar name={student.fullName} ring="done" size={60} />
            <View style={styles.profileCopy}>
              <Text style={textStyles.title}>{student.fullName}</Text>
              <Text style={textStyles.caption}>
                {student.className} · {student.testsCompleted} работ · средняя «
                {student.averageGrade.toFixed(1).replace('.', ',')}»
              </Text>
            </View>
          </View>

          <HeroCard>
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={[textStyles.eyebrow, styles.eyebrowFaint]}>
                    Последняя работа
                  </Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.heroPct}>
                      {lastPct !== null ? lastPct : '—'}
                    </Text>
                    {lastPct !== null ? (
                      <Text style={styles.heroPctSuffix}>%</Text>
                    ) : null}
                  </View>
                </View>

                {deltaValue !== null ? (
                  <View style={styles.deltaColumn}>
                    <DeltaTag value={deltaValue} />
                    <Text style={textStyles.caption}>к прошлой</Text>
                  </View>
                ) : null}
              </View>

              {historyItems.length > 0 ? (
                <HistoryBars items={historyItems} />
              ) : (
                <Text style={textStyles.bodySmall}>
                  Пока нет проверенных работ
                </Text>
              )}
            </View>
          </HeroCard>

          {lastPct !== null && prevPct !== null && lastPct !== prevPct ? (
            <Card
              style={
                lastPct < prevPct
                  ? styles.summaryCardWarning
                  : styles.summaryCardPrimary
              }
            >
              <AppIcon
                color={lastPct < prevPct ? colors.warning : colors.primary}
                name="insight"
                size={18}
              />
              <Text style={[textStyles.bodySmall, styles.summaryText]}>
                {lastPct < prevPct
                  ? 'Результат снизился по сравнению с прошлой работой'
                  : 'Результат растёт'}
              </Text>
            </Card>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="Над чем работать" />
            <Card style={styles.topicsCard}>
              {student.weakTopics.length === 0 ? (
                <Text style={textStyles.bodySmall}>
                  Слабых тем пока не выявлено
                </Text>
              ) : (
                student.weakTopics.map((topic) => (
                  <AccuracyBar
                    caption={`${topic.totalQuestions - topic.wrongCount} из ${topic.totalQuestions} верно`}
                    key={topic.topicCode}
                    label={topic.topicName}
                    value={topic.accuracyPct}
                  />
                ))
              )}
            </Card>
          </View>

          {confusionRows.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Путает буквы" />
              <View style={styles.confusionsGrid}>
                {confusionRows.map((row, rowIndex) => (
                  <View
                    key={`conf-row-${rowIndex}`}
                    style={styles.confusionRow}
                  >
                    {row.map((item, colIndex) =>
                      item ? (
                        <View key={item.letter} style={styles.confusionCell}>
                          <Card style={styles.confusionCard}>
                            <Text style={styles.confusionPair}>
                              {item.letter}{' '}
                              <Text style={styles.confusionArrow}>→</Text>{' '}
                              <Text style={styles.confusionTarget}>
                                {item.confusions[0]}
                              </Text>
                            </Text>
                            <Text style={textStyles.caption}>
                              {item.wrong} раз
                            </Text>
                          </Card>
                        </View>
                      ) : (
                        <View
                          key={`conf-empty-${rowIndex}-${colIndex}`}
                          style={styles.confusionCell}
                        />
                      ),
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {student.handwritingQualityPct !== null &&
          student.handwritingQualityPct < 70 ? (
            <Card style={styles.handwritingCard}>
              <AppIcon color={colors.warning} name="warning" size={20} />
              <Text style={[textStyles.bodySmall, styles.handwritingText]}>
                Почерк распознаётся с трудом — проверьте спорные буквы в
                разборе
              </Text>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  confusionArrow: {
    color: colors.textFaint,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
  },
  confusionCard: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  confusionCell: {
    flex: 1,
  },
  confusionPair: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.title,
    lineHeight: 28,
  },
  confusionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confusionTarget: {
    color: colors.zoneBad,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.title,
  },
  confusionsGrid: {
    gap: spacing.sm,
  },
  deltaColumn: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  eyebrowFaint: {
    color: colors.textFaint,
  },
  handwritingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  handwritingText: {
    color: colors.text,
    flex: 1,
  },
  heroContent: {
    gap: spacing.md,
  },
  heroPct: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.hero,
    fontVariant: ['tabular-nums'],
    lineHeight: 44,
  },
  heroPctSuffix: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  heroTopRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  scoreRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.xxs,
  },
  section: {
    gap: spacing.sm,
  },
  summaryCardPrimary: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCardWarning: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryText: {
    color: colors.text,
    flex: 1,
  },
  topicsCard: {
    gap: spacing.md,
  },
});
