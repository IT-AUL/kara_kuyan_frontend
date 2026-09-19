import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { demoInsight, demoProgress, demoTopics } from '@/demo/demo-data';
import {
  BarChart,
  Button,
  Card,
  MetricTile,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedTabs,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, spacing } from '@/design-system/tokens';

const TABS = ['Обзор', 'Темы', 'Ученики'] as const;

const gradeHistory = [
  { label: 'КР1', value: 55 },
  { label: 'КР2', value: 66 },
  { label: 'КР3', value: 74 },
] as const;

export function AnalyticsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

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
        subtitle="7-А · Исем килешләре"
        title="Аналитика класса"
      />

      <SegmentedTabs activeIndex={activeTab} onTabChange={setActiveTab} tabs={TABS} />

      {activeTab === 0 && (
        <>
          <Card style={styles.statsCard}>
            <Text style={textStyles.body}>Средний результат класса</Text>
            <View style={styles.resultRow}>
              <Text selectable style={textStyles.display}>74%</Text>
              <Text style={styles.delta}>+8% к прошлой работе</Text>
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <BarChart bars={gradeHistory} title="Динамика оценок" />
          </Card>

          <Card style={styles.recommendation} tone="raised">
            <StatusPill icon="insight" label="Тема для повторения" tone="info" />
            <Text selectable style={textStyles.title}>
              {demoInsight.title}
            </Text>
            <Text style={textStyles.bodySmall}>
              11 из 25 учеников допустили ошибки
            </Text>
            <Button compact onPress={() => {}} title="Подобрать упражнения" variant="ghost" />
          </Card>
        </>
      )}

      {activeTab === 1 && (
        <View style={styles.section}>
          <SectionHeader subtitle="Ранжировано по количеству ошибок, без рейтинга учеников." title="Темы для повторения" />
          <Card style={styles.topics}>
            {demoTopics.map((topic, index) => (
              <View
                key={topic.title}
                style={[styles.topicRow, index < demoTopics.length - 1 && styles.topicDivider]}
              >
                <Text style={styles.ordinal}>{index + 1}</Text>
                <View style={styles.topicCopy}>
                  <Text selectable style={textStyles.body}>
                    {topic.title}
                  </Text>
                  <Text style={textStyles.bodySmall}>{topic.detail}</Text>
                </View>
                <Text style={[textStyles.titleSmall, styles.count]}>{topic.count}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {activeTab === 2 && (
        <View style={styles.section}>
          <SectionHeader title="Ученики" subtitle="Средние результаты по классу" />
          <View style={styles.metrics}>
            <MetricTile detail={`${demoProgress.checkedCount}/${demoProgress.studentCount} работ`} label="Проверено" value={`${demoProgress.completionPercent}%`} />
            <MetricTile label="Среднее" value="74%" tone="success" />
            <MetricTile label="Проверить" value="4" tone="warning" />
          </View>
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
