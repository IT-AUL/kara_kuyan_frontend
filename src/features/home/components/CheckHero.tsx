import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button, GlowLayer, StatusPill, StudentDots, textStyles } from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { colors, fontFamilies, fontSizes, hairline, radius, spacing } from '@/design-system/tokens';

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
export function CheckHero({ className, assignmentTitle, gradeLevel, checkedCount, studentCount, onScan, onOpenTest }: CheckHeroProps) {
  const done = studentCount > 0 && checkedCount >= studentCount;
  const subtitle = [className, gradeLevel ? `${gradeLevel} класс` : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      <GlowLayer color={colors.primary} size={280} style={styles.glow} />
      <View style={styles.topLine} />

      <StatusPill icon={done ? 'checkCircle' : 'scan'} label={done ? 'Все работы проверены' : 'Идёт проверка'} tone={done ? 'success' : 'info'} />

      <Pressable accessibilityHint="Открывает страницу теста" accessibilityLabel={`${assignmentTitle}. ${subtitle}`} accessibilityRole="button" onPress={onOpenTest} style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[textStyles.title, styles.grow]}>
            {assignmentTitle}
          </Text>
          <AppIcon color={colors.textFaint} name="chevronRight" size={20} />
        </View>
        <Text style={textStyles.bodySmall}>{subtitle}</Text>
      </Pressable>

      <View accessible accessibilityLabel={`Проверено ${checkedCount} из ${studentCount}`} style={styles.numberRow}>
        <CountUp style={styles.big} value={checkedCount} />
        <View style={styles.of}>
          <Text style={styles.ofText}>из {studentCount}</Text>
          <Text style={textStyles.caption}>проверено</Text>
        </View>
      </View>

      <StudentDots checked={checkedCount} total={studentCount} />

      <View style={styles.cta}>
        <View pointerEvents="none" style={styles.ctaGlow} />
        <Button icon="scan" onPress={onScan} title="Сканировать лист" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    lineHeight: 70,
    minWidth: 44,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    borderWidth: hairline,
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  cta: { marginTop: spacing.xs },
  ctaGlow: {
    backgroundColor: withAlpha(colors.primary, 0.16),
    borderRadius: radius.lg + 4,
    bottom: -4,
    left: -4,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  glow: { right: -90, top: -110 },
  numberRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  of: { gap: 2, paddingBottom: 10 },
  ofText: { color: colors.textMuted, fontFamily: fontFamilies.semibold, fontSize: fontSizes.titleSmall },
  grow: { flex: 1 },
  titleBlock: { gap: 2 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  topLine: { backgroundColor: withAlpha(colors.primary, 0.28), height: 1, left: spacing.xl, position: 'absolute', right: spacing.xl, top: 0 },
});
