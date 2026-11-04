import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName, textStyles } from '@/design-system';
import { colors, fontFamilies, hairline, radius, spacing, touchTarget } from '@/design-system/tokens';

import { CellBoxes } from './CellBoxes';

type TaskRowProps = {
  index?: number;
  prompt: string;
  topicName?: string;
  answer: string;
  cellCount: number;
  onPress?: () => void;
  accessibilityState?: { checked?: boolean; disabled?: boolean };
  right?: ReactNode;
  footer?: ReactNode;
  /** Smaller cells, two-line prompt: more tasks per screen (bank lists). */
  dense?: boolean;
  last?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: AppIconName;
};

/** One task of a test: prompt, topic and the printed answer row. Used by the builder, bank picker and test detail. */
export function TaskRow({
  index,
  prompt,
  topicName,
  answer,
  cellCount,
  onPress,
  accessibilityState,
  right,
  footer,
  dense = false,
  last = false,
  onAction,
  actionLabel = 'Убрать задание',
  actionIcon = 'close',
}: TaskRowProps) {
  const body = (
    <View style={styles.inner}>
      {index !== undefined ? <Text style={styles.number}>{index}</Text> : null}
      <View style={styles.copy}>
        <Text numberOfLines={dense ? 2 : 3} selectable={!onPress} style={styles.prompt}>
          {prompt}
        </Text>
        <CellBoxes answer={answer} cellCount={cellCount} />
      </View>
      {onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          android_ripple={{ borderless: true, color: 'rgba(244, 248, 245, 0.12)' }}
          hitSlop={2}
          onPress={onAction}
          style={styles.actionCircle}
        >
          <AppIcon color={colors.textFaint} name={actionIcon} size={18} />
        </Pressable>
      ) : null}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
  return (
    <View style={[styles.row, !last && styles.divider]}>
      {onPress ? (
        <Pressable
          accessibilityLabel={topicName ? `${prompt}. ${topicName}` : prompt}
          accessibilityRole="checkbox"
          accessibilityState={accessibilityState}
          android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }}
          onPress={onPress}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  actionCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: { flex: 1, gap: spacing.xs },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: hairline },
  inner: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: touchTarget, paddingVertical: spacing.sm },
  number: {
    ...textStyles.caption,
    color: colors.textFaint,
    fontVariant: ['tabular-nums'],
    width: 16,
  },
  prompt: {
    ...textStyles.bodySmall,
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
  right: { alignItems: 'center', justifyContent: 'center' },
  row: { overflow: 'hidden' },
});
