import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TestSummary } from '@/adapters/api/backend';
import { AppIcon, Card, textStyles } from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { colors, fontFamilies, hairline, radius, spacing, touchTarget } from '@/design-system/tokens';

type OtherWorksProps = {
  tests: TestSummary[];
  currentId: string | null;
  className: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
};

export function OtherWorks({ tests, currentId, className, onOpen, onNew }: OtherWorksProps) {
  const items = tests.filter((t) => t.testId !== currentId).slice(0, 3);
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={textStyles.titleSmall}>Другие работы</Text>
        <Pressable
          accessibilityLabel="Новый тест"
          accessibilityRole="button"
          hitSlop={4}
          onPress={onNew}
          style={styles.newBtn}
        >
          <Text style={styles.newBtnText}>+ Новый тест</Text>
        </Pressable>
      </View>

      <Card style={styles.card}>
        {items.map((t, index) => (
          <Pressable
            accessibilityLabel={`${t.title}. ${t.questionsCount} заданий`}
            accessibilityRole="button"
            android_ripple={{ color: withAlpha(colors.text, 0.08) }}
            key={t.testId}
            onPress={() => onOpen(t.testId)}
            style={[styles.row, index < items.length - 1 && styles.rowBorder]}
          >
            <View style={styles.badge}>
              <Text numberOfLines={1} style={styles.badgeText}>
                {className ?? ''}
              </Text>
            </View>
            <View style={styles.rowCenter}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                {t.title}
              </Text>
              <Text style={textStyles.caption}>{t.questionsCount} заданий</Text>
            </View>
            <AppIcon color={colors.textFaint} name="chevronRight" size={18} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    width: 40,
  },
  badgeText: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
  },
  card: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  newBtn: {
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xxs,
  },
  newBtnText: {
    ...textStyles.bodySmall,
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingVertical: spacing.sm,
  },
  rowBorder: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  rowCenter: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...textStyles.bodySmall,
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
  section: {
    gap: spacing.xs,
  },
});
