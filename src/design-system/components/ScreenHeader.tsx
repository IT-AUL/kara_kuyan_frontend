import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyles } from '../theme';
import { colors, spacing, touchTarget } from '../tokens';
import { AppIcon } from './AppIcon';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  size?: 'large' | 'compact';
  right?: ReactNode;
  /** Clamp a long title (test names) to this many lines. */
  titleLines?: number;
};

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  showBack = false,
  size,
  right,
  titleLines,
}: ScreenHeaderProps) {
  const router = useRouter();
  const titleStyle = (size ?? (showBack ? 'compact' : 'large')) === 'large'
    ? textStyles.display
    : textStyles.title;

  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        {showBack ? (
          <Pressable
            accessibilityLabel="Назад"
            accessibilityRole="button"
            android_ripple={{ borderless: true, color: 'rgba(244, 248, 245, 0.12)' }}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AppIcon name="arrowBack" color={colors.text} size={22} />
          </Pressable>
        ) : null}
        <View style={styles.copy}>
          {eyebrow ? <Text style={textStyles.eyebrow}>{eyebrow}</Text> : null}
          <Text numberOfLines={titleLines} selectable={!titleLines} style={titleStyle}>
            {title}
          </Text>
          {subtitle ? <Text style={textStyles.bodySmall}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderRadius: touchTarget / 2,
    height: touchTarget,
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    width: touchTarget,
  },
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  right: {
    marginLeft: spacing.md,
    marginTop: spacing.xs,
  },
  textGroup: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
