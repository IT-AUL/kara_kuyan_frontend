import { StyleSheet, Text, View } from 'react-native';

import { textStyles } from '../theme';
import { colors, radius, spacing } from '../tokens';

type MetricTileProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'success' | 'warning' | 'error';
};

const valueColor = {
  default: colors.text,
  error: colors.error,
  success: colors.successSoft,
  warning: colors.warning,
} as const;

export function MetricTile({ label, value, detail, tone = 'default' }: MetricTileProps) {
  const a11yLabel = detail ? `${label}: ${value}, ${detail}` : `${label}: ${value}`;
  return (
    <View accessibilityLabel={a11yLabel} style={styles.tile}>
      <Text style={textStyles.caption}>{label}</Text>
      <Text selectable style={[textStyles.numeric, { color: valueColor[tone] }]}>
        {value}
      </Text>
      {detail ? <Text style={textStyles.caption}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
    padding: spacing.sm,
  },
});
