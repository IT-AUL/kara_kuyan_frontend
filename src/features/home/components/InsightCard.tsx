import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, Card, textStyles } from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { colors, fontFamilies, radius, spacing, touchTarget } from '@/design-system/tokens';

type InsightCardProps = {
  topicName: string;
  affected: number;
  total: number;
  /** Number of checked works the insight rests on; below 5 the card says it is preliminary. */
  basedOn: number;
  onOpen: () => void;
  onDismiss: () => void;
};

export function InsightCard({ topicName, affected, total, onOpen, onDismiss }: InsightCardProps) {
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityHint="Открывает аналитику класса"
        accessibilityLabel={`Важно сегодня. ${topicName}: ошибка у ${affected} из ${total}`}
        accessibilityRole="button"
        android_ripple={{ color: withAlpha(colors.text, 0.08) }}
        onPress={onOpen}
        style={styles.body}
      >
        <View style={styles.iconBox}>
          <AppIcon color={colors.zoneBad} name="insight" size={20} />
        </View>
        <View style={styles.center}>
          <Text style={textStyles.caption}>Важно сегодня</Text>
          <Text numberOfLines={2} style={styles.message}>
            {topicName}: ошибка у {affected} из {total}
          </Text>
        </View>
        <AppIcon color={colors.textFaint} name="chevronRight" size={18} />
      </Pressable>
      <Pressable
        accessibilityLabel="Скрыть рекомендацию"
        accessibilityRole="button"
        android_ripple={{ borderless: true, color: withAlpha(colors.text, 0.12) }}
        hitSlop={4}
        onPress={onDismiss}
        style={styles.dismiss}
      >
        <AppIcon color={colors.textFaint} name="close" size={18} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  card: {
    alignItems: 'center',
    borderRadius: radius.xxl,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
    paddingRight: spacing.xxs,
  },
  center: {
    flex: 1,
    gap: 2,
  },
  dismiss: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.zoneBad, 0.12),
    borderRadius: radius.lg,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  message: {
    ...textStyles.bodySmall,
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
});
