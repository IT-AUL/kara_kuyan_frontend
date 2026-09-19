import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { AppIcon, Button, Card, Screen, ScreenHeader, SectionHeader, textStyles } from '@/design-system';
import { colors, radius, spacing, touchTarget } from '@/design-system/tokens';
import { StudentIdentityCard } from './components/StudentIdentityCard';
import { scanSession, useScanSession } from './scanSession';

export function StudentIdentifiedScreen() {
  const router = useRouter();
  const { outcome, student, studentMatched } = useScanSession();
  const { students, tests } = useActiveContext();
  const title = tests.find((t) => t.testId === outcome?.assignmentId)?.title ?? outcome?.assignmentId ?? '';

  return (
    <Screen
      footer={
        <Button
          disabled={!student || !outcome}
          icon="arrowRight"
          onPress={() => router.push('/assessment-result')}
          title="Показать результат"
        />
      }
    >
      <ScreenHeader
        eyebrow="Идентификация"
        showBack
        subtitle="Проверьте ученика до открытия результата."
        title="Лист распознан"
      />

      <StudentIdentityCard
        matched={studentMatched}
        nameText={outcome?.studentNameText ?? ''}
        student={student}
        variant={outcome?.variant ?? 1}
      />

      <Card style={styles.meta}>
        <View style={styles.row}>
          <Text style={textStyles.bodySmall}>Работа</Text>
          <Text selectable style={textStyles.body}>
            {title}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={textStyles.bodySmall}>Шаблон</Text>
          <Text style={textStyles.body}>{outcome?.qrRecognised ? 'QR распознан' : 'QR не прочитан'}</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Изменить ученика" />
        <Card style={styles.roster}>
          {students.map((s) => (
            <Pressable
              accessibilityRole="button"
              key={s.studentId}
              onPress={() => scanSession.selectStudent(s.studentId)}
              style={styles.rosterRow}
            >
              <Text style={textStyles.body}>{s.fullName}</Text>
              {student?.id === s.studentId ? <AppIcon color={colors.primary} name="check" size={20} /> : null}
            </Pressable>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing.sm },
  roster: { gap: 0, paddingVertical: spacing.xxs },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  rosterRow: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xs,
  },
  section: { gap: spacing.sm },
});
