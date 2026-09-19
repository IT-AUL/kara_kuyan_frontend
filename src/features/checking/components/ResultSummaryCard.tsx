import { StyleSheet, Text, View } from 'react-native';

import { demoSheet, demoSheetGrade, demoSheetPercent } from '@/demo/demo-data';
import { Card, MetricTile, StatusPill, textStyles } from '@/design-system';
import { spacing } from '@/design-system/tokens';

export function ResultSummaryCard() {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={textStyles.caption}>Результат листа</Text>
          <Text selectable style={textStyles.display}>
            {demoSheet.score} из {demoSheet.maxScore}
          </Text>
        </View>
        <StatusPill label={`Оценка ${demoSheetGrade}`} tone="success" />
      </View>
      <View style={styles.metrics}>
        <MetricTile label="Верно" value={`${demoSheetPercent}%`} tone="success" />
        <MetricTile label="На проверку" value="1" tone="warning" />
        <MetricTile label="Вариант" value="2" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  copy: {
    gap: spacing.xxs,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
