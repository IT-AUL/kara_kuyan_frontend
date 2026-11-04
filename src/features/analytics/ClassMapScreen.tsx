import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import {
  AppIcon,
  Button,
  Card,
  colors,
  EmptyState,
  fontFamilies,
  fontSizes,
  Notice,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  spacing,
  textStyles,
} from '@/design-system';

import {
  formatShortName,
  type HeatmapColumn,
  HeatmapGrid,
  type HeatmapStudent,
} from './components/HeatmapGrid';
import { useTestResults } from './data';

const SORT_TABS = ['По баллу', 'По журналу'] as const;

export function ClassMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const ctx = useActiveContext();

  const paramId = typeof params.id === 'string' && params.id.length > 0 ? params.id : null;
  const assignmentId = paramId ?? ctx.assignmentId;

  const [sortIndex, setSortIndex] = useState(0);
  const [highlight, setHighlight] = useState<number | null>(null);

  const results = useTestResults(assignmentId);
  const { analytics, overview, status } = results;

  const columns: HeatmapColumn[] =
    analytics && analytics.questions.length > 0
      ? analytics.questions.map((q) => ({
          number: q.number,
          accuracyPct: Math.round(q.accuracyPct),
        }))
      : overview.hits.map((h) => ({
          number: h.number,
          accuracyPct: h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0,
        }));

  const sortedRows =
    sortIndex === 0
      ? [...overview.rows].sort((a, b) => {
          const scoreA = a.work ? a.work.score : -1;
          const scoreB = b.work ? b.work.score : -1;
          return scoreB - scoreA;
        })
      : overview.rows;

  const students: HeatmapStudent[] = sortedRows.map((row) => {
    const cells: (boolean | null)[] = columns.map((col) => {
      const taskResult = row.work?.tasks?.find((t) => t.number === col.number);
      if (taskResult !== undefined) {
        return taskResult.correct;
      }
      if (row.work !== null && analytics) {
        const q = analytics.questions.find((item) => item.number === col.number);
        if (q) {
          const isWrong = q.wrongAnswers.some((w) => w.studentId === row.studentId);
          return !isWrong;
        }
      }
      return null;
    });

    return {
      id: row.studentId,
      name: row.name,
      grade: row.work ? row.work.grade : null,
      cells,
    };
  });

  const handleColumnPress = (n: number) => {
    setHighlight((prev) => (prev === n ? null : n));
  };

  const selectedQuestion =
    highlight !== null
      ? (analytics?.questions.find((q) => q.number === highlight) ?? null)
      : null;

  const highlightColIndex =
    highlight !== null ? columns.findIndex((c) => c.number === highlight) : -1;

  const wrongNames: string[] =
    highlight !== null
      ? selectedQuestion && selectedQuestion.wrongAnswers.length > 0
        ? selectedQuestion.wrongAnswers.map((w) => formatShortName(w.studentName))
        : highlightColIndex >= 0
          ? students
              .filter((s) => s.cells[highlightColIndex] === false)
              .map((s) => formatShortName(s.name))
          : []
      : [];

  const wrongCaption =
    wrongNames.length > 0
      ? `Ошиблись ${wrongNames.length}: ${wrongNames.slice(0, 3).join(', ')}${
          wrongNames.length > 3 ? '…' : ''
        }`
      : 'Ошиблись 0';

  return (
    <Screen>
      <ScreenHeader showBack title="Карта класса" />

      {status === 'offline' ? (
        <Notice message="Нет связи: показаны сохранённые данные" />
      ) : null}
      {status === 'error' ? (
        <Notice
          actionLabel="Повторить"
          message="Не удалось загрузить карту класса."
          onAction={() => void results.refresh()}
          tone="error"
        />
      ) : null}

      {students.length === 0 || columns.length === 0 ? (
        <EmptyState
          body="Проверьте работы учеников, чтобы увидеть тепловую карту класса по заданиям."
          icon="analytics"
          title="Нет данных для карты класса"
        />
      ) : (
        <>
          <View style={styles.toolbarRow}>
            <Text style={textStyles.caption}>
              {students.length} учеников × {columns.length} заданий
            </Text>
            <View style={styles.tabsWrap}>
              <SegmentedTabs
                activeIndex={sortIndex}
                onTabChange={setSortIndex}
                tabs={SORT_TABS}
              />
            </View>
          </View>

          <Card style={styles.gridCard}>
            <HeatmapGrid
              columns={columns}
              highlight={highlight}
              onColumnPress={handleColumnPress}
              students={students}
            />
          </Card>

          {highlight !== null ? (
            <Card style={styles.selectedCard}>
              <View style={styles.selectedCopy}>
                <Text style={styles.selectedTitle}>Задание {highlight}</Text>
                <Text style={textStyles.caption}>{wrongCaption}</Text>
              </View>
              <Button
                compact
                onPress={() => {
                  if (assignmentId) {
                    router.push({
                      pathname: '/analytics-task',
                      params: { id: assignmentId, q: String(highlight) },
                    });
                  }
                }}
                title="Разбор"
                variant="secondary"
              />
            </Card>
          ) : (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: colors.zoneOk, opacity: 0.78 },
                  ]}
                />
                <Text style={textStyles.caption}>верно</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: colors.zoneBad, opacity: 0.85 },
                  ]}
                />
                <Text style={textStyles.caption}>ошибка</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: colors.surfaceHigh },
                  ]}
                />
                <Text style={textStyles.caption}>нет данных</Text>
              </View>
            </View>
          )}

          <Card style={styles.hintCard}>
            <AppIcon color={colors.zoneMid} name="insight" size={20} />
            <Text style={[textStyles.bodySmall, styles.hintText]}>
              Красный столбец — проблема всего класса. Красная строка — ученику
              нужна личная помощь.
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    padding: spacing.sm,
  },
  hintCard: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hintText: {
    flex: 1,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxs,
  },
  legendSwatch: {
    borderRadius: 4,
    height: 12,
    width: 12,
  },
  selectedCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  selectedCopy: {
    flex: 1,
    gap: 2,
  },
  selectedTitle: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.bodySmall,
    lineHeight: 20,
  },
  tabsWrap: {
    width: 180,
  },
  toolbarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
});
