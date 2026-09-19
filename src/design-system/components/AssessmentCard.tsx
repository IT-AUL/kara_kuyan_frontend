import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { StatusPill } from './StatusPill';
import { textStyles } from '../theme';
import { colors, spacing } from '../tokens';

type AssessmentCardAssessment = {
  className: string;
  reviewCount: number;
  title: string;
  topic: string;
  variantCount: number;
};

type AssessmentCardProgress = {
  checkedCount: number;
  completionPercent: number;
  studentCount: number;
};

type AssessmentCardProps = {
  assessment: AssessmentCardAssessment;
  progress: AssessmentCardProgress;
  onContinue?: () => void;
  compact?: boolean;
};

export function AssessmentCard({
  assessment,
  progress,
  onContinue,
  compact = false,
}: AssessmentCardProps) {
  const a11yLabel = `${assessment.title}. ${assessment.className}. Проверено ${progress.checkedCount} из ${progress.studentCount}`;
  return (
    <Card accessibilityLabel={a11yLabel} style={styles.card} tone="raised">
      <View style={styles.header}>
        <StatusPill label="Активная проверка" tone="info" />
        <Text style={textStyles.caption}>{assessment.variantCount} варианта</Text>
      </View>
      <View style={styles.copy}>
        <Text selectable style={textStyles.title}>
          {assessment.title}
        </Text>
        <Text style={textStyles.bodySmall}>{assessment.topic}</Text>
        <Text style={textStyles.caption}>{assessment.className}</Text>
      </View>
      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <Text style={textStyles.bodySmall}>Проверено</Text>
          <Text selectable style={[textStyles.titleSmall, styles.count]}>
            {progress.checkedCount} из {progress.studentCount}
          </Text>
        </View>
        <ProgressBar percent={progress.completionPercent} />
      </View>
      {!compact ? (
        <View style={styles.footer}>
          <View style={styles.reviewBadge}>
            <Text style={[textStyles.caption, styles.reviewText]}>
              {assessment.reviewCount} требуют проверки
            </Text>
          </View>
          {onContinue ? <Button compact icon="scan" onPress={onContinue} title="Продолжить" /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  copy: {
    gap: spacing.xxs,
  },
  count: {
    color: colors.primary,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBlock: {
    gap: spacing.xs,
  },
  progressLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewBadge: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reviewText: {
    color: colors.warning,
  },
});
