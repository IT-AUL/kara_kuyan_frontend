import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, radius, spacing } from '../tokens';
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
  const fgColor = textColor[variant];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={compact ? 2 : 0}
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
        {icon ? <AppIcon color={fgColor} name={icon} size={compact ? 18 : 20} /> : null}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={1}
          style={[styles.label, compact && styles.labelCompact, { color: fgColor }]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const textColor: Record<ButtonVariant, string> = {
  primary: '#03140B',
  secondary: colors.text,
  ghost: colors.textMuted,
  danger: colors.error,
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  compact: {
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  danger: {
    backgroundColor: colors.surfaceRaised,
  },
  disabled: {
    opacity: 0.45,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
  },
  labelCompact: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  primary: {
    backgroundColor: colors.primary,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
  },
});
