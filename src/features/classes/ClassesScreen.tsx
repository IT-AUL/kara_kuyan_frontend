import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { demoAssessment, demoProgress, demoStudents, demoTeacher } from '@/demo/demo-data';
import {
  Button,
  Card,
  ListRow,
  MetricTile,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedTabs,
  StatusPill,
  textStyles,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';

const TABS = ['Ученики', 'Тесты', 'Выводы'] as const;

export function ClassesScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow="Классы"
        subtitle={demoTeacher.school}
        title="7-А · Татар теле"
      />

      <Card style={styles.classCard}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text selectable style={textStyles.title}>
              {demoAssessment.className}
            </Text>
            <Text style={textStyles.bodySmall}>25 учеников · 2 варианта работ</Text>
          </View>
          <StatusPill label="Активен" tone="success" />
        </View>
        <ProgressBar percent={demoProgress.completionPercent} />
        <View style={styles.metrics}>
          <MetricTile label="Проверено" value={`${demoProgress.checkedCount}`} />
          <MetricTile label="Осталось" value={`${demoProgress.remainingCount}`} />
          <MetricTile label="На проверку" value={`${demoProgress.reviewCount}`} tone="warning" />
        </View>
      </Card>

      <SegmentedTabs activeIndex={activeTab} onTabChange={setActiveTab} tabs={TABS} />

      {activeTab === 0 && (
        <View style={styles.section}>
          <Card style={styles.list}>
            {demoStudents.map((student, index) => (
              <ListRow
                icon="person"
                isLast={index === demoStudents.length - 1}
                key={student.id}
                onPress={() => {}}
                right={<StatusPill label={`В${student.variant}`} tone="neutral" />}
                subtitle={student.code}
                title={student.name}
                variant="plain"
              />
            ))}
          </Card>
          <Button icon="person" title="Добавить ученика" variant="secondary" />
        </View>
      )}

      {activeTab === 1 && (
        <View style={styles.section}>
          <SectionHeader title="Тесты" subtitle="Активные и завершённые" />
          <ListRow
            icon="library"
            right={<StatusPill label="Активна" tone="info" />}
            subtitle="8 заданий · 2 варианта"
            title={demoAssessment.title}
          />
        </View>
      )}

      {activeTab === 2 && (
        <View style={styles.section}>
          <SectionHeader title="Выводы" subtitle="По результатам проверенных работ" />
          <Card style={styles.insightCard} tone="raised">
            <StatusPill icon="insight" label="Основная сложность" tone="info" />
            <Text selectable style={textStyles.body}>
              Чыгыш килеше — 11 из 25 ошибок в окончаниях
            </Text>
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  classCard: {
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightCard: {
    gap: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
});
