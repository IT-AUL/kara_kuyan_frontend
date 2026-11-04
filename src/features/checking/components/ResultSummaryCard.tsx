import { StyleSheet, Text, View } from 'react-native';

import { GradePill, HeroCard, ProgressStrip, textStyles } from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';

type ResultSummaryCardProps = {
  studentName?: string;
  score: number;
  maxScore: number;
  percent?: number;
  grade: number;
  reviewLeft?: number;
  variant?: number;
};

const clampGrade = (g: number): 2 | 3 | 4 | 5 => Math.min(5, Math.max(2, Math.round(g))) as 2 | 3 | 4 | 5;

export function ResultSummaryCard({
  studentName = 'Ученик не выбран',
  score,
  maxScore,
  grade,
}: ResultSummaryCardProps) {
  return (
    <HeroCard>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={textStyles.title}>{studentName}</Text>
            <Text selectable style={[textStyles.body, styles.score]}>
              {score} из {maxScore}
            </Text>
          </View>
          <GradePill grade={clampGrade(grade)} size={48} />
        </View>
        <ProgressStrip done={score} total={maxScore} />
      </View>
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  score: {
    color: colors.textMuted,
  },
});
