import { StyleSheet, Text, View } from 'react-native';

import type { AssessmentTask, ReviewStatus } from '@/domain/assessment/model';
import { AppIcon, StatusPill, textStyles } from '@/design-system';
import { colors, radius, spacing } from '@/design-system/tokens';

const statusLabel: Record<ReviewStatus, string> = {
  correct: 'Верно',
  error: 'Ошибка',
  missing: 'Не выполнено',
  pending: 'Ожидает',
  review: 'На проверку',
};

const statusTone = {
  correct: 'success',
  error: 'error',
  missing: 'neutral',
  pending: 'neutral',
  review: 'warning',
} as const;

type TaskResultRowProps = {
  task: AssessmentTask;
  reviewed?: boolean;
  overridden?: 'accept' | 'reject';
  isLast?: boolean;
};

export function TaskResultRow({ task, reviewed = false, overridden, isLast = false }: TaskResultRowProps) {
  const resolvedReview = reviewed && task.status === 'review';
  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      <View style={styles.numberWrap}>
        <Text style={[textStyles.caption, styles.number]}>{task.number}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={textStyles.body}>{task.prompt}</Text>
        <View style={styles.evidence}>
          {task.status === 'review' && !resolvedReview ? (
            <AppIcon color={colors.warning} name="warning" size={15} />
          ) : null}
          <Text selectable style={textStyles.bodySmall}>
            {task.status === 'review'
              ? `${task.expected} → ${task.recognized}`
              : task.recognized}
          </Text>
        </View>
      </View>
      {overridden ? (
        <StatusPill
          label={overridden === 'accept' ? 'Засчитано' : 'Не засчитано'}
          tone={overridden === 'accept' ? 'success' : 'error'}
        />
      ) : resolvedReview ? (
        <StatusPill label="Проверено" tone="success" />
      ) : (
        <StatusPill label={statusLabel[task.status]} tone={statusTone[task.status]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
  },
  evidence: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  number: {
    color: colors.primary,
  },
  numberWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
