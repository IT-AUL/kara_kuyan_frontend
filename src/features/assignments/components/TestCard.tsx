import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Card, Tag, textStyles } from '@/design-system';
import { colors, fontFamilies, spacing, touchTarget } from '@/design-system/tokens';

type TestCardProps = {
  title: string;
  taskCount: number;
  gradeLevel: number;
  current?: boolean;
  muted?: boolean;
  /** Progress of the class on this test (server numbers, or local for the current test). */
  progress?: { checked: number; total: number; averagePct: number | null };
  /** Human-readable due date, when the assignment has one. */
  due?: string;
  onPress: () => void;
};

/** A test in the list: Card padding 16, title (bodySmall semibold), caption with task count, chevronRight on the right. */
export function TestCard({ title, taskCount, gradeLevel, current = false, muted = false, progress, due, onPress }: TestCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}. ${taskCount} заданий, ${gradeLevel} класс${current ? '. Текущий тест' : ''}`}
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }}
      onPress={onPress}
      style={muted ? styles.muted : undefined}
    >
      <Card style={styles.card}>
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          <Text style={textStyles.caption}>
            {taskCount} заданий · {gradeLevel} класс
            {progress ? ` · проверено ${progress.checked} из ${progress.total}${progress.averagePct !== null && progress.checked > 0 ? ` · ${progress.averagePct}%` : ''}` : ''}
            {due ? ` · до ${due}` : ''}
          </Text>
        </View>
        {current ? <Tag label="Текущий" tone="ok" /> : null}
        <AppIcon color={colors.textFaint} name="chevronRight" size={20} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    padding: spacing.md,
  },
  copy: { flex: 1, gap: spacing.xxs },
  muted: { opacity: 0.6 },
  title: {
    ...textStyles.bodySmall,
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
});
