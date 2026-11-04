import { StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  colors,
  fontFamilies,
  hairline,
  radius,
  spacing,
  textStyles,
} from '@/design-system';

export type SyncWorkStatus = 'sent' | 'waiting' | 'failed';

type SyncWorkRowProps = {
  title: string;
  total: number;
  sent: number;
  status: SyncWorkStatus;
  isLast?: boolean;
};

export function SyncWorkRow({
  title,
  total,
  sent,
  status,
  isLast = false,
}: SyncWorkRowProps) {
  let statusIcon: AppIconName = 'check';
  let statusColor: string = colors.primary;
  let statusLabel = 'Отправлено';

  if (status === 'waiting') {
    statusIcon = 'time';
    statusColor = colors.warning;
    statusLabel = `Ждёт отправки · ${total - sent}`;
  } else if (status === 'failed') {
    statusIcon = 'error';
    statusColor = colors.error;
    statusLabel = 'Ошибка отправки';
  }

  const fillPct =
    total > 0 ? Math.min(100, Math.max(0, Math.round((sent / total) * 100))) : 0;

  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      <View style={styles.badge}>
        <AppIcon color={colors.textMuted} name="assignment" size={20} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
          <Text style={styles.count}>{` · ${total} работ`}</Text>
        </Text>
        <View style={styles.statusRow}>
          <AppIcon color={statusColor} name={statusIcon} size={14} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
        {status === 'waiting' ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fillPct}%` }]} />
          </View>
        ) : null}
      </View>
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
    width: 40,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  count: {
    color: colors.textFaint,
    fontFamily: fontFamilies.regular,
  },
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  progressFill: {
    backgroundColor: colors.warning,
    borderRadius: radius.pill,
    height: '100%',
  },
  progressTrack: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    height: 4,
    marginTop: spacing.xxs,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statusText: {
    ...textStyles.caption,
  },
  title: {
    ...textStyles.bodySmall,
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
});
