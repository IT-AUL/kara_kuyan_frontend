import { StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  Card,
  colors,
  fontFamilies,
  radius,
  spacing,
  textStyles,
} from '@/design-system';

type PromiseCardProps = {
  icon: AppIconName;
  title: string;
  caption: string;
};

export function PromiseCard({ icon, title, caption }: PromiseCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconBox}>
        <AppIcon color={colors.primary} name={icon} size={22} />
      </View>
      <View style={styles.body}>
        <Text style={[textStyles.body, styles.title]}>{title}</Text>
        <Text style={[textStyles.caption, styles.caption]}>{caption}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 2,
  },
  caption: {
    color: colors.textMuted,
  },
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    fontFamily: fontFamilies.semibold,
  },
});
