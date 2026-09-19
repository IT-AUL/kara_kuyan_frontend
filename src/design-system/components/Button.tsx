import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, fontSizes, radius, spacing, touchTarget } from '../tokens';
import { AppIcon, type AppIconName } from './AppIcon';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: AppIconName;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  compact = false,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      android_ripple={{ color: 'rgba(244, 248, 245, 0.12)' }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        compact && styles.compact,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <AppIcon
            name={icon}
            color={variant === 'primary' ? colors.background : textColor[variant]}
            size={18}
          />
        ) : null}
        <Text style={[styles.label, { color: textColor[variant] }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const textColor: Record<ButtonVariant, string> = {
  primary: colors.background,
  secondary: colors.text,
  ghost: colors.primary,
  danger: colors.error,
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  compact: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  danger: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.body,
  },
  pressed: {
    opacity: 0.86,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderWidth: 1,
  },
});
