import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, hairline, radius, spacing } from '../tokens';

type CardProps = PropsWithChildren<{
  accessibilityLabel?: string;
  style?: ViewStyle;
  tone?: 'surface' | 'raised' | 'soft';
  outlined?: boolean;
}>;

export function Card({ accessibilityLabel, children, style, tone = 'surface', outlined = false }: CardProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.base, styles[tone], outlined && styles.outlined, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  outlined: {
    borderColor: colors.divider,
    borderWidth: hairline,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
  },
  surface: {
    backgroundColor: colors.surface,
  },
});
