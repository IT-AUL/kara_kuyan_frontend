import { StyleSheet, Text, View } from 'react-native';

import { textStyles } from '../theme';
import { colors, radius, spacing } from '../tokens';
import { AppIcon, type AppIconName } from './AppIcon';
import { Button } from './Button';

type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <AppIcon color={colors.primary} name={icon} size={30} />
      </View>
      <Text style={textStyles.titleSmall}>{title}</Text>
      <Text style={[textStyles.bodySmall, styles.body]}>{body}</Text>
      {actionLabel && onAction ? <Button compact onPress={onAction} title={actionLabel} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    textAlign: 'center',
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
});
