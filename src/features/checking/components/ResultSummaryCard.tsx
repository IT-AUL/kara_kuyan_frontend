import { StyleSheet, Text, View } from 'react-native';

import { Card, MetricTile, StatusPill, textStyles } from '@/design-system';
import { spacing } from '@/design-system/tokens';

type ResultSummaryCardProps = {
  score: number;
  maxScore: number;
  percent: number;
  grade: number;
  reviewLeft: number;
  variant: number;
};

export function ResultSummaryCard({ score, maxScore, percent, grade, reviewLeft, variant }: ResultSummaryCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={textStyles.caption}>Результат листа</Text>
          <Text selectable style={textStyles.display}>
            {score} из {maxScore}
          </Text>
        </View>
        <StatusPill
          label={reviewLeft > 0 ? 'Оценка после проверки' : `Оценка ${grade}`}
          tone={reviewLeft > 0 ? 'warning' : 'success'}
        />
      </View>
      <View style={styles.metrics}>
        <MetricTile label="Верно" value={`${percent}%`} tone="success" />
        <MetricTile label="На проверку" value={String(reviewLeft)} tone={reviewLeft > 0 ? 'warning' : undefined} />
        <MetricTile label="Вариант" value={String(variant)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  copy: { gap: spacing.xxs },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', gap: spacing.sm },
});
