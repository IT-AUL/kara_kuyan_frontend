import { StyleSheet, Text, View } from 'react-native';

import type { Student } from '@/domain/assessment/model';
import { Avatar, Card, Tag, textStyles } from '@/design-system';
import { spacing } from '@/design-system/tokens';

type StudentIdentityCardProps = {
  student: Student | null;
  matched: boolean;
  nameText: string;
  variant: number;
};

export function StudentIdentityCard({ student, matched, nameText, variant }: StudentIdentityCardProps) {
  if (!student) {
    return (
      <Card style={styles.card} tone="raised">
        <View style={styles.identity}>
          <Avatar name="?" ring="none" size={40} />
          <View style={styles.copy}>
            <Text style={textStyles.titleSmall}>Ученик не определён</Text>
            <Text style={textStyles.caption}>
              {`Вариант ${variant}${nameText ? ` · на листе: ${nameText}` : ''}`}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card} tone="raised">
      <View style={styles.identity}>
        <Avatar name={student.name} ring="done" size={40} />
        <View style={styles.copy}>
          <Text selectable style={textStyles.titleSmall}>
            {student.name}
          </Text>
          <Text style={textStyles.caption}>
            {`Вариант ${variant}${nameText ? ` · на листе: ${nameText}` : ''}`}
          </Text>
        </View>
        <Tag
          icon="check"
          label={matched ? 'Распознан' : 'Выбран'}
          tone={matched ? 'ok' : 'neutral'}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
