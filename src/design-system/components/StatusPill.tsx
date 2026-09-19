import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, fontSizes, radius, spacing } from '../tokens';
import { AppIcon, type AppIconName } from './AppIcon';

type StatusPillProps = {
  label: string;
  tone?: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  icon?: AppIconName;
  accessibilityLabel?: string;
};

const iconByTone: Record<NonNullable<StatusPillProps['tone']>, AppIconName> = {
  error: 'error',
  info: 'insight',
  neutral: 'time',
  success: 'checkCircle',
  warning: 'warning',
};

const colorByTone = {
  error: colors.error,
  info: colors.primary,
  neutral: colors.textMuted,
  success: colors.successSoft,
  warning: colors.warning,
} as const;

const backgroundByTone = {
  error: colors.errorSoft,
  info: colors.primarySoft,
  neutral: colors.surfaceRaised,
  success: colors.primarySoft,
  warning: colors.warningSoft,
} as const;

export function StatusPill({ label, tone = 'neutral', icon, accessibilityLabel }: StatusPillProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? label}
      accessible
      style={[styles.pill, { backgroundColor: backgroundByTone[tone] }]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppIcon color={colorByTone[tone]} name={icon ?? iconByTone[tone]} size={15} />
      </View>
      <Text style={[styles.label, { color: colorByTone[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
