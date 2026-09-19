import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { classAnalyticsResource, progressResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import {
  BarChart,
  Button,
  Card,
  MetricTile,
  Notice,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedTabs,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, spacing } from '@/design-system/tokens';

const TABS = ['Обзор', 'Темы', 'Ученики'] as const;

export function AnalyticsScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const [activeTab, setActiveTab] = useState(0);
  const analytics = useResource(ctx.classId ? classAnalyticsResource(ctx.classId) : null);
  const series = useResource(ctx.classId ? progressResource(ctx.classId) : null);
  const data = analytics.data;
  const points = series.data ?? [];
  const topics = [...(data?.topMistakes ?? [])].filter((t) => t.affectedStudents > 0).sort((a, b) => b.failureRatePct - a.failureRatePct);
  const top = topics[0];
  const delta = points.length >= 2 ? points[points.length - 1].value - points[points.length - 2].value : null;
  const dist = data?.gradeDistribution ?? {};

  return (
    <Screen
      footer={
        <Button
          icon="export"
          onPress={() => router.push('/export-gradebook')}
          title="Экспортировать ведомость"
        />
      }
    >
      <ScreenHeader
        showBack
        subtitle={ctx.className ?? 'Класс не выбран'}
        title="Аналитика класса"
      />

      <SegmentedTabs activeIndex={activeTab} onTabChange={setActiveTab} tabs={TABS} />

      {analytics.offline ? <Notice message="Нет связи с сервером: показаны сохранённые данные." /> : null}
      {analytics.status === 'error' ? <Notice actionLabel="Повторить" message="Не удалось загрузить аналитику." onAction={() => void analytics.refresh()} tone="error" /> : null}
      {!ctx.classId ? <Notice message="Создайте класс, чтобы увидеть аналитику." tone="info" /> : null}

      {activeTab === 0 && data && (
        <>
          <Card style={styles.statsCard}>
            <Text style={textStyles.body}>Средний результат класса</Text>
            <View style={styles.resultRow}>
              <Text selectable style={textStyles.display}>{Math.round(data.averageScorePct)}%</Text>
              {delta !== null ? <Text style={styles.delta}>{delta >= 0 ? '+' : ''}{delta}% к прошлой работе</Text> : null}
            </View>
          </Card>

          {points.length > 0 ? (
            <Card style={styles.chartCard}>
              <BarChart bars={points.map((p) => ({ label: p.label, value: p.value, maxValue: 100 }))} title="Динамика по работам" />
            </Card>
          ) : null}

          {top ? (
            <Card style={styles.recommendation} tone="raised">
              <StatusPill icon="insight" label="Тема для повторения" tone="info" />
              <Text selectable style={textStyles.title}>Рекомендуем повторить: {top.topicName}</Text>
              <Text style={textStyles.bodySmall}>Затронуто учеников: {top.affectedStudents} из {data.studentsCount}</Text>
            </Card>
          ) : (
            <Notice message="Пока мало проверенных работ для рекомендаций." tone="info" />
          )}
        </>
      )}

      {activeTab === 1 && (
        <View style={styles.section}>
          <SectionHeader subtitle="Ранжировано по доле ошибок, без рейтинга учеников." title="Темы для повторения" />
          {topics.length === 0 ? (
            <Notice message="Ошибок по темам пока нет." tone="info" />
          ) : (
            <Card style={styles.topics}>
              {topics.map((topic, index) => (
                <View key={topic.topicCode} style={[styles.topicRow, index < topics.length - 1 && styles.topicDivider]}>
                  <Text style={styles.ordinal}>{index + 1}</Text>
                  <View style={styles.topicCopy}>
                    <Text selectable style={textStyles.body}>{topic.topicName}</Text>
                    <Text style={textStyles.bodySmall}>Ошибки: {Math.round(topic.failureRatePct)}%</Text>
                  </View>
                  <Text style={[textStyles.titleSmall, styles.count]}>{topic.affectedStudents}</Text>
                </View>
              ))}
            </Card>
          )}
          {data && data.difficultLetters.length > 0 ? (
            <Text style={textStyles.bodySmall}>
              Трудные буквы: {data.difficultLetters.map((c) => `${c.letter} (${Math.round(c.errorRatePct)}%)`).join(', ')}
            </Text>
          ) : null}
        </View>
      )}

      {activeTab === 2 && data && (
        <View style={styles.section}>
          <SectionHeader title="Класс в целом" subtitle="Распределение оценок, без списка учеников" />
          <View style={styles.metrics}>
            <MetricTile detail={`${ctx.progress.checkedCount}/${ctx.progress.studentCount} работ`} label="Проверено" value={`${ctx.progress.percent}%`} />
            <MetricTile label="Среднее" value={`${Math.round(data.averageScorePct)}%`} tone="success" />
          </View>
          <Card style={styles.chartCard}>
            <BarChart bars={['5', '4', '3', '2'].map((g) => ({ label: `«${g}»`, value: dist[g] ?? 0 }))} title="Оценки" />
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    gap: spacing.sm,
  },
  count: {
    color: colors.warning,
  },
  delta: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ordinal: {
    color: colors.textFaint,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    minWidth: 18,
  },
  recommendation: {
    gap: spacing.md,
  },
  resultRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  statsCard: {
    gap: spacing.xs,
  },
  topicCopy: {
    flex: 1,
    gap: 2,
  },
  topicDivider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  topicRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  topics: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
});
