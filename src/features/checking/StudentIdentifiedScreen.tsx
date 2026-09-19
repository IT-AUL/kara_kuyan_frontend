import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { AppIcon, Button, Card, Screen, ScreenHeader, SectionHeader, textStyles } from '@/design-system';
import { colors, radius, spacing, touchTarget } from '@/design-system/tokens';
import { StudentIdentityCard } from './components/StudentIdentityCard';
import { SheetWarnings } from './components/SheetWarnings';
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

      <SheetWarnings outcome={outcome} />

      <StudentIdentityCard
        matched={studentMatched}
        nameText={outcome?.studentNameText ?? ''}
        student={student}
        variant={outcome?.variant ?? 1}
      />

      <Card style={styles.meta}>
        <View style={styles.row}>
          <Text style={[textStyles.bodySmall, styles.label]}>Работа</Text>
          <Text numberOfLines={3} style={[textStyles.body, styles.value]}>
            {title}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[textStyles.bodySmall, styles.label]}>Шаблон</Text>
          <Text style={[textStyles.body, styles.value]}>{outcome?.qrRecognised ? 'QR распознан' : 'QR не прочитан'}</Text>
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
  label: { flexShrink: 0 },
  row: { alignItems: 'flex-start', alignSelf: 'stretch', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  value: { flex: 1, flexShrink: 1, textAlign: 'right' },
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
