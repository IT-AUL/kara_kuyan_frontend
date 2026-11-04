import { StyleSheet, Text, View } from 'react-native';

import type { AssessmentTask } from '@/domain/assessment/model';
import { Tag, textStyles } from '@/design-system';
import { colors, hairline, spacing } from '@/design-system/tokens';

type TaskResultRowProps = {
  task: AssessmentTask;
  reviewed?: boolean;
  overridden?: 'accept' | 'reject';
  isLast?: boolean;
};

function resolveTag(
  task: AssessmentTask,
  reviewed: boolean,
  overridden?: 'accept' | 'reject',
): { label: string; tone: 'ok' | 'mid' | 'bad' } {
  if (overridden === 'accept' || (reviewed && task.status === 'review') || task.status === 'correct') {
    return { label: 'верно', tone: 'ok' };
  }
  if (overridden === 'reject') {
    return { label: 'ошибка', tone: 'bad' };
  }
  if (task.status === 'review') {
    return { label: 'проверить', tone: 'mid' };
  }
  return { label: 'ошибка', tone: 'bad' };
}

export function TaskResultRow({ task, reviewed = false, overridden, isLast = false }: TaskResultRowProps) {
  const resolvedReview = reviewed && task.status === 'review';
  const tag = resolveTag(task, reviewed, overridden);
  const answerText =
    task.status === 'review' && !resolvedReview && !overridden
      ? `${task.expected} → ${task.recognized}`
      : task.recognized;

  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      <Text style={styles.number}>{task.number}</Text>
      <View style={styles.copy}>
        <Text style={textStyles.body}>{task.prompt}</Text>
        <Text selectable style={textStyles.bodySmall}>
          {answerText}
        </Text>
      </View>
      <Tag label={tag.label} tone={tag.tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
  },
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  number: {
    ...textStyles.caption,
    color: colors.textFaint,
    fontVariant: ['tabular-nums'],
    minWidth: 20,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
