import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { AppIcon, Avatar, Button, Card, Screen, ScreenHeader, SectionHeader, Tag, textStyles } from '@/design-system';
import { colors, hairline, radius, spacing, touchTarget } from '@/design-system/tokens';
import { SheetWarnings } from './components/SheetWarnings';
import { StudentIdentityCard } from './components/StudentIdentityCard';
import { scanSession, useScanSession } from './scanSession';

export function StudentIdentifiedScreen() {
  const router = useRouter();
  const { outcome, student, studentMatched } = useScanSession();
  const { students, tests } = useActiveContext();
  const title = tests.find((t) => t.testId === outcome?.assignmentId)?.title ?? outcome?.assignmentId ?? '';
  const headerTitle = studentMatched && student ? `Это работа: ${student.name}?` : 'Чей это лист?';
  const subtitleParts = [
    title || null,
    outcome ? `Вариант ${outcome.variant}` : null,
    outcome ? (outcome.qrRecognised ? 'QR распознан' : 'QR не прочитан') : null,
  ].filter(Boolean);

  return (
    <Screen
      footer={
        <Button
          disabled={!student || !outcome}
          icon="check"
          onPress={() => router.push('/assessment-result')}
          title="Да, продолжить"
        />
      }
    >
      {!studentMatched ? <Tag icon="qr" label="Имя не распознано" tone="mid" /> : null}

      <ScreenHeader
        showBack
        subtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined}
        title={headerTitle}
      />

      <SheetWarnings outcome={outcome} />

      {student || studentMatched ? (
        <StudentIdentityCard
          matched={studentMatched}
          nameText={outcome?.studentNameText ?? ''}
          student={student}
          variant={outcome?.variant ?? 1}
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title={studentMatched ? 'Или выберите другого ученика' : 'Выберите ученика'} />
        <Card style={styles.roster}>
          {students.length === 0 ? (
            <Text style={[textStyles.bodySmall, styles.emptyText]}>В этом классе пока нет учеников.</Text>
          ) : (
            students.map((s, index) => {
              const selected = student?.id === s.studentId;
              return (
                <Pressable
                  accessibilityLabel={s.fullName}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={s.studentId}
                  onPress={() => scanSession.selectStudent(s.studentId)}
                  style={({ pressed }) => [
                    styles.rosterRow,
                    index < students.length - 1 && styles.rosterRowDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.rosterIdentity}>
                    <Avatar name={s.fullName} ring={selected ? 'done' : 'none'} size={36} />
                    <Text style={[textStyles.body, styles.rosterName]}>{s.fullName}</Text>
                  </View>
                  {selected ? <AppIcon color={colors.primary} name="check" size={20} /> : null}
                </Pressable>
              );
            })
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.9,
  },
  roster: {
    gap: 0,
    paddingVertical: spacing.xxs,
  },
  rosterIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rosterName: {
    flex: 1,
  },
  rosterRow: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  rosterRowDivider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  section: {
    gap: spacing.sm,
  },
});
