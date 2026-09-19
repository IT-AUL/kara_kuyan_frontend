import { StyleSheet, Text, View } from 'react-native';

import { demoSheet } from '@/demo/demo-data';
import { AppIcon, Card, StatusPill, textStyles } from '@/design-system';
import { colors, radius, spacing } from '@/design-system/tokens';

export function StudentIdentityCard() {
  const { student } = demoSheet;

  return (
    <Card style={styles.card}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <AppIcon color={colors.primary} name="person" size={28} />
        </View>
        <View style={styles.copy}>
          <Text selectable style={textStyles.title}>
            {student.name}
          </Text>
          <Text style={textStyles.bodySmall}>
            {demoSheet.student.code} · Вариант {student.variant}
          </Text>
        </View>
      </View>
      <StatusPill label="Ученик определён по QR" tone="success" />
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  card: {
    gap: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
