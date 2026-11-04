import { StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  Button,
  Card,
  colors,
  fontFamilies,
  radius,
  spacing,
  textStyles,
} from '@/design-system';
import type { OutboxStatus } from '@/domain/sync/outbox';

type SyncSummaryProps = {
  counts: Record<OutboxStatus, number>;
  lastSentAt: number | null;
  onRetry: () => void;
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SyncSummary({ counts, lastSentAt, onRetry }: SyncSummaryProps) {
  const waiting = counts.pending + counts.syncing;

  let badgeBg: string = colors.primarySoft;
  let iconName: AppIconName = 'checkCircle';
  let iconColor: string = colors.primary;
  let title = 'Всё отправлено';
  let subtitle = lastSentAt
    ? `Последняя отправка: ${formatTime(lastSentAt)}`
    : 'Пока нечего отправлять';
  let showRetry = false;

  if (counts.failed > 0) {
    badgeBg = colors.errorSoft;
    iconName = 'error';
    iconColor = colors.error;
    title = `Не отправлено: ${counts.failed}`;
    subtitle = 'Работы сохранены на телефоне';
    showRetry = true;
  } else if (waiting > 0) {
    badgeBg = colors.warningSoft;
    iconName = 'sync';
    iconColor = colors.warning;
    title = `На телефоне: ${waiting}`;
    subtitle = 'Отправим сами, когда появится сеть';
  }

  return (
    <Card style={styles.card}>
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <AppIcon color={iconColor} name={iconName} size={22} />
      </View>
      <View style={styles.copy}>
        <Text selectable style={styles.title}>
          {title}
        </Text>
        <Text style={textStyles.bodySmall}>{subtitle}</Text>
      </View>
      {showRetry ? (
        <Button
          compact
          onPress={onRetry}
          title="Повторить"
          variant="secondary"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...textStyles.body,
    fontFamily: fontFamilies.semibold,
  },
});
