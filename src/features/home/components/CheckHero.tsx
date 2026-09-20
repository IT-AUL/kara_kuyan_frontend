import { Pressable, StyleSheet, Text, View } from 'react-native';

import { studentsText } from '@/domain/format/plural';
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
  const started = checkedCount > 0;
  const status = done ? { label: 'Все работы проверены', tone: 'success' as const, icon: 'checkCircle' as const } : started ? { label: 'Идёт проверка', tone: 'info' as const, icon: 'scan' as const } : { label: 'Ещё не начинали', tone: 'neutral' as const, icon: 'time' as const };
  const subtitle = [className, gradeLevel ? `${gradeLevel} класс` : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      <GlowLayer color={colors.primary} size={280} style={styles.glow} />
      <View style={styles.topLine} />

      <StatusPill icon={status.icon} label={status.label} tone={status.tone} />

      <Pressable accessibilityHint="Открывает страницу теста" accessibilityLabel={`${assignmentTitle}. ${subtitle}`} accessibilityRole="button" onPress={onOpenTest} style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[textStyles.title, styles.grow]}>
            {assignmentTitle}
          </Text>
          <AppIcon color={colors.textFaint} name="chevronRight" size={20} />
        </View>
        <Text style={textStyles.bodySmall}>{subtitle}</Text>
      </Pressable>

      {started ? (
        <View accessible accessibilityLabel={`Проверено ${checkedCount} из ${studentCount}`} style={styles.numberRow}>
          <CountUp style={styles.big} value={checkedCount} />
          <View style={styles.of}>
            <Text style={styles.ofText}>из {studentCount}</Text>
            <Text style={textStyles.caption}>проверено</Text>
          </View>
        </View>
      ) : (
        <Text style={textStyles.body}>
          {studentCount > 0 ? `Отсканируйте бланки: ${studentsText(studentCount)}. Результаты появятся здесь.` : 'В классе пока нет учеников. Добавьте их во вкладке «Ещё» → «Классы».'}
        </Text>
      )}

      {studentCount > 0 ? <StudentDots checked={checkedCount} total={studentCount} /> : null}

      <View style={styles.cta}>
        <View pointerEvents="none" style={styles.ctaGlow} />
        {done ? (
          <Button icon="analytics" onPress={onOpenTest} title="Открыть итоги" />
        ) : (
          <Button icon="scan" onPress={onScan} title={started ? 'Сканировать следующий лист' : 'Сканировать первый лист'} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    lineHeight: 54,
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
