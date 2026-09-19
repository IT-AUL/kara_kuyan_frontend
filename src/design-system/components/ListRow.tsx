import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyles } from '../theme';
import { colors, hairline, radius, spacing, touchTarget } from '../tokens';
import { AppIcon, type AppIconName } from './AppIcon';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  right?: ReactNode;
  onPress?: () => void;
  variant?: 'card' | 'plain';
  isLast?: boolean;
};

export function ListRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
  variant = 'card',
  isLast = false,
}: ListRowProps) {
  const plain = variant === 'plain';

  return (
    <Pressable
      accessibilityLabel={onPress ? `${title}${subtitle ? `. ${subtitle}` : ''}` : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        plain ? styles.plain : styles.card,
        plain && !isLast && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        plain ? (
          <AppIcon color={colors.textMuted} name={icon} size={21} />
        ) : (
          <View style={styles.iconWrap}>
            <AppIcon color={colors.primary} name={icon} size={21} />
          </View>
        )
      ) : null}
      <View style={styles.copy}>
        <Text style={textStyles.body}>{title}</Text>
        {subtitle ? <Text style={textStyles.bodySmall}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <AppIcon color={colors.textFaint} name="chevronRight" size={20} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    minHeight: touchTarget + 16,
    padding: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  plain: {
    backgroundColor: colors.transparent,
    minHeight: 72,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
