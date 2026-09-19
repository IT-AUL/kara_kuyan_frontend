import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, StatusPill, StudentDots, textStyles } from '@/design-system';
import { colors, hairline, radius, spacing, touchTarget } from '@/design-system/tokens';


type InsightCardProps = {
  topicName: string;
  affected: number;
  total: number;
  /** Number of checked works the insight rests on; below 5 the card says it is preliminary. */
  basedOn: number;
  onOpen: () => void;
  onDismiss: () => void;
};

export function InsightCard({ topicName, affected, total, basedOn, onOpen, onDismiss }: InsightCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <Pressable
        accessibilityHint="Открывает аналитику класса"
        accessibilityLabel={`Рекомендуем повторить: ${topicName}. Затронуто учеников: ${affected} из ${total}.`}
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }}
        onPress={onOpen}
        style={styles.body}
      >
        <View style={styles.head}>
          <StatusPill icon="insight" label={basedOn < 5 ? `Предварительно · по ${basedOn} раб.` : `По ${basedOn} работам`} tone="info" />
        </View>
        <Text style={textStyles.caption}>Рекомендуем повторить</Text>
        <Text numberOfLines={2} selectable style={textStyles.titleSmall}>
          {topicName}
        </Text>
        <View style={styles.stat}>
          <StudentDots checked={affected} size="sm" total={total} />
          <Text style={textStyles.bodySmall}>Затронуто учеников: {affected} из {total}</Text>
        </View>
        <View style={styles.more}>
          <Text style={styles.moreText}>Открыть аналитику</Text>
          <AppIcon color={colors.primary} name="chevronRight" size={18} />
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Скрыть рекомендацию"
        accessibilityRole="button"
        android_ripple={{ borderless: true, color: 'rgba(244, 248, 245, 0.12)' }}
        hitSlop={4}
        onPress={onDismiss}
        style={styles.dismiss}
      >
        <AppIcon color={colors.textMuted} name="close" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  accent: { backgroundColor: colors.warning, bottom: 0, left: 0, position: 'absolute', top: 0, width: 3 },
  body: { gap: spacing.xs, padding: spacing.lg, paddingLeft: spacing.lg + 3, paddingRight: touchTarget },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderWidth: hairline,
    overflow: 'hidden',
  },
  dismiss: { alignItems: 'center', height: touchTarget, justifyContent: 'center', position: 'absolute', right: 0, top: 0, width: touchTarget },
  head: { alignItems: 'flex-start', flexDirection: 'row' },
  more: { alignItems: 'center', flexDirection: 'row', gap: 2, minHeight: 32 },
  moreText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  stat: { gap: spacing.xs },
});
