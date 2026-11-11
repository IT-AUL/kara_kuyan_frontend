import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AssessmentTask } from '@/domain/assessment/model';
import { AppIcon, Tag, textStyles } from '@/design-system';
import { colors, hairline, spacing } from '@/design-system/tokens';

type TaskResultRowProps = {
  task: AssessmentTask;
  reviewed?: boolean;
  overridden?: 'accept' | 'reject';
  uncertainCount?: number;
  fixedByTeacher?: boolean;
  isLast?: boolean;
  onPress?: () => void;
};

function resolveTag(
  task: AssessmentTask,
  reviewed: boolean,
  overridden?: 'accept' | 'reject',
  uncertainCount?: number,
): { label: string; tone: 'ok' | 'mid' | 'bad' } {
  if (overridden === 'accept' || (reviewed && task.status === 'review') || task.status === 'correct') {
    return { label: 'верно', tone: 'ok' };
  }
  if (overridden === 'reject') {
    return { label: 'ошибка', tone: 'bad' };
  }
  if (task.status === 'review') {
    return {
      label: uncertainCount && uncertainCount > 0 ? `${uncertainCount} яч.` : 'проверить',
      tone: 'mid',
    };
  }
  return { label: 'ошибка', tone: 'bad' };
}

export function TaskResultRow({
  task,
  reviewed = false,
  overridden,
  uncertainCount,
  fixedByTeacher = false,
  isLast = false,
  onPress,
}: TaskResultRowProps) {
  const resolvedReview = reviewed && task.status === 'review';
  const tag = resolveTag(task, reviewed, overridden, uncertainCount);
  const showComparison =
    (task.status === 'review' && !resolvedReview && !overridden) ||
    task.status === 'error' ||
    fixedByTeacher;
  const answerText = showComparison ? `${task.expected} → ${task.recognized}` : task.recognized;

  const content = (
    <View style={[styles.row, !isLast && styles.divider]}>
      <Text style={styles.number}>{task.number}</Text>
      <View style={styles.copy}>
        <Text style={textStyles.body}>{task.prompt}</Text>
        <Text selectable style={textStyles.bodySmall}>
          {answerText}
        </Text>
      </View>
      <Tag label={tag.label} tone={tag.tone} />
      {onPress ? <AppIcon color={colors.textFaint} name="chevronRight" size={16} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityLabel={`Задание ${task.number}: ${task.prompt}, статус ${tag.label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
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
  pressed: {
    opacity: 0.85,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
