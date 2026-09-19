import { StyleSheet, Text, View } from 'react-native';

import type { Student } from '@/domain/assessment/model';
import { AppIcon, Card, StatusPill, textStyles } from '@/design-system';
import { colors, radius, spacing } from '@/design-system/tokens';

type StudentIdentityCardProps = {
  student: Student | null;
  matched: boolean;
  nameText: string;
  variant: number;
};

export function StudentIdentityCard({ student, matched, nameText, variant }: StudentIdentityCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <AppIcon color={colors.primary} name="person" size={28} />
        </View>
        <View style={styles.copy}>
          <Text selectable style={textStyles.title}>
            {student ? student.name : 'Ученик не определён'}
          </Text>
          <Text style={textStyles.bodySmall}>
            {student ? `${student.code} · ` : ''}Вариант {variant}
          </Text>
        </View>
      </View>
      {student ? (
        <StatusPill label={matched ? 'Определён по имени на листе' : 'Выбран вручную'} tone={matched ? 'success' : 'neutral'} />
      ) : (
        <StatusPill label="Выберите ученика ниже" tone="warning" />
      )}
      {nameText ? <Text style={textStyles.caption}>На листе прочитано: {nameText}</Text> : null}
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
  card: { gap: spacing.lg },
  copy: { flex: 1, gap: spacing.xxs },
  identity: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
});
