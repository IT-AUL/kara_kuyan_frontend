import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, StatusPill, textStyles } from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { colors, fontFamilies, hairline, radius, spacing } from '@/design-system/tokens';

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

/** A test in the list: task-count tile, title, grade. The current test is outlined in green. */
export function TestCard({ title, taskCount, gradeLevel, current = false, muted = false, progress, due, onPress }: TestCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}. ${taskCount} заданий, ${gradeLevel} класс${current ? '. Текущий тест' : ''}`}
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }}
      onPress={onPress}
      style={[styles.card, current && styles.current, muted && styles.muted]}
    >
      <View style={[styles.tile, current && styles.tileCurrent]}>
        <Text maxFontSizeMultiplier={1.2} style={styles.count}>{taskCount}</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.unit}>зад.</Text>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
        <Text style={textStyles.caption}>
          {gradeLevel} класс
          {progress ? ` · проверено ${progress.checked} из ${progress.total}${progress.averagePct !== null && progress.checked > 0 ? ` · ${progress.averagePct}%` : ''}` : ''}
          {due ? ` · до ${due}` : ''}
        </Text>
      </View>
      {current ? <StatusPill label="Текущий" tone="info" /> : <AppIcon color={colors.textFaint} name="chevronRight" size={20} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderWidth: hairline,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.sm,
  },
  copy: { flex: 1, gap: 2 },
  count: { color: colors.text, fontFamily: fontFamilies.bold, fontSize: 22, lineHeight: 24 },
  current: { backgroundColor: withAlpha(colors.primary, 0.07), borderColor: withAlpha(colors.primary, 0.5) },
  muted: { opacity: 0.6 },
  tile: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.md, height: 56, justifyContent: 'center', width: 56 },
  tileCurrent: { backgroundColor: colors.primarySoft },
  title: { color: colors.text, fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 21 },
  unit: { color: colors.textMuted, fontFamily: fontFamilies.medium, fontSize: 10 },
});
