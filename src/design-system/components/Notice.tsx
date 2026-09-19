import { StyleSheet, Text, View } from 'react-native';

import { textStyles } from '../theme';
import { colors, radius, spacing } from '../tokens';
import { Button } from './Button';

type NoticeProps = {
  tone?: 'warning' | 'error' | 'info';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Inline status line for loading/offline/error states; never colour-only (always carries text). */
export function Notice({ tone = 'warning', message, actionLabel, onAction }: NoticeProps) {
  return (
    <View accessibilityRole="alert" style={[styles.box, { borderColor: tone === 'error' ? colors.error : tone === 'info' ? colors.divider : colors.warning }]}>
      <Text style={textStyles.bodySmall}>{message}</Text>
      {actionLabel && onAction ? <Button compact onPress={onAction} title={actionLabel} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
});
