import { StyleSheet, Text, View } from 'react-native';

import { Button, HeroCard, ProgressStrip, Tag, textStyles } from '@/design-system';
import { colors, fontFamilies, spacing } from '@/design-system/tokens';

import { CountUp } from './CountUp';

type CheckHeroProps = {
  className: string;
  assignmentTitle: string;
  gradeLevel?: number;
  checkedCount: number;
  studentCount: number;
  /** The primary action: scan the next sheet. */
  onScan: () => void;
  /** Opens the test page (results, tasks, students). */
  onOpenTest: () => void;
};

/** The focal point of Home: what is being checked, how far along, and the one next action. */
export function CheckHero({ className, assignmentTitle, checkedCount, studentCount, onScan, onOpenTest }: CheckHeroProps) {
  return (
    <HeroCard>
      <View style={styles.content}>
        <Tag icon="time" label="Текущая работа" tone="ok" />

        <Text numberOfLines={2} style={[textStyles.title, styles.title]}>
          {assignmentTitle}
        </Text>

        <View accessible accessibilityLabel={`Проверено ${checkedCount} из ${studentCount}. ${className}`} style={styles.numberRow}>
          <View style={styles.countLine}>
            <CountUp style={styles.big} value={checkedCount} />
            <Text style={styles.ofText}> из {studentCount} проверено</Text>
          </View>
          <Text style={textStyles.bodySmall}>{className}</Text>
        </View>

        <ProgressStrip done={checkedCount} review={0} total={studentCount} />

        <View style={styles.cta}>
          <Button
            icon="scan"
            onPress={onScan}
            title={checkedCount > 0 ? 'Продолжить проверку' : 'Проверить стопку'}
            variant="primary"
          />
          <Button
            onPress={onOpenTest}
            title="Открыть работу"
            variant="ghost"
          />
        </View>
      </View>
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  big: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    lineHeight: 40,
  },
  content: {
    gap: spacing.sm,
  },
  countLine: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexShrink: 1,
  },
  cta: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  numberRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  ofText: {
    ...textStyles.body,
    color: colors.textMuted,
  },
  title: {
    marginTop: spacing.xxs,
  },
});
