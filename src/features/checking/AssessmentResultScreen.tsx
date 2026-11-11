import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { session } from '@/data/session';
import { defaultGradeScale, gradeForPercent, scorePercent } from '@/domain/assessment/grading';
import type { AssessmentTask } from '@/domain/assessment/model';
import { effectiveStatus, resolveTaskWithFixes, scoreOutcome } from '@/domain/scan/evaluate';
import {
  AppIcon,
  Avatar,
  Button,
  Card,
  colors,
  fontFamilies,
  fontSizes,
  radius,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  Tag,
  textStyles,
} from '@/design-system';
import { spacing, touchTarget } from '@/design-system/tokens';
import { ResultSummaryCard } from './components/ResultSummaryCard';
import { TaskResultRow } from './components/TaskResultRow';
import { SheetWarnings } from './components/SheetWarnings';
import { ZeroTouchBanner } from './components/ZeroTouchBanner';
import { scanSession, useScanSession } from './scanSession';

export function AssessmentResultScreen() {
  const router = useRouter();
  const { outcome, overrides, cellFixes, student, captureMs } = useScanSession();

  if (!outcome) {
    return (
      <Screen
        footer={
          <Button
            icon="scan"
            onPress={() => router.replace('/checking')}
            title="К проверке"
            variant="secondary"
          />
        }
      >
        <ScreenHeader eyebrow="Результат" title="Нет результата" subtitle="Сначала отсканируйте лист." />
      </Screen>
    );
  }

  const { score, maxScore, reviewLeft, uncertainCells } = scoreOutcome(outcome, overrides, cellFixes);
  const percent = scorePercent(score, maxScore);
  const hasReview = reviewLeft > 0;
  const studentName = student?.name ?? 'Ученик не выбран';
  const pristine =
    !hasReview &&
    Object.keys(overrides).length === 0 &&
    Object.keys(cellFixes).length === 0 &&
    outcome.tasks.every((t) => t.status !== 'review');

  const saveAndNextSheet = async () => {
    const saved = await scanSession.save();
    if (saved) router.replace('/scan');
  };

  const saveAndBackToClass = async () => {
    const saved = await scanSession.save();
    if (saved) router.replace('/checking');
  };

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <View style={styles.statusRow}>
            <StatusPill icon="time" label="Не сохранено" tone="neutral" />
            {captureMs !== null ? (
              <Text style={styles.timingText}>{`OCR v4 · ${(captureMs / 1000).toFixed(1)} с`}</Text>
            ) : null}
          </View>
          {!student ? (
            <Button
              icon="person"
              onPress={() => router.push('/student-identified')}
              title="Выбрать ученика"
              variant="primary"
            />
          ) : hasReview ? (
            <Button
              icon="review"
              onPress={() => router.push('/task-review')}
              title={
                uncertainCells > 0
                  ? `Проверить жёлтые ячейки (${uncertainCells})`
                  : 'Проверить отмеченный ответ'
              }
              variant="primary"
            />
          ) : (
            <Button
              icon="scan"
              onPress={saveAndNextSheet}
              title="Сохранить и следующий лист"
              variant="primary"
            />
          )}
          {!hasReview && student ? (
            <Button
              icon="check"
              onPress={saveAndBackToClass}
              title="Сохранить и к классу"
              variant="secondary"
            />
          ) : (
            <Button
              onPress={() => router.replace('/checking')}
              title="К проверке"
              variant="secondary"
            />
          )}
        </View>
      }
    >
      <ScreenHeader
        eyebrow="Результат · OCR v4"
        showBack
        subtitle={`Вариант ${outcome.variant}`}
        title={pristine ? 'Всё чисто!' : 'Работа проверена'}
      />

      <SheetWarnings outcome={outcome} />

      <Pressable
        accessibilityLabel={`Ученик: ${studentName}. Нажмите, чтобы изменить ученика`}
        accessibilityRole="button"
        onPress={() => router.push('/student-identified')}
        style={({ pressed }) => [styles.studentBar, pressed && styles.pressed]}
      >
        <Avatar name={studentName} ring={student ? 'done' : 'none'} size={36} />
        <View style={styles.studentCopy}>
          <Text numberOfLines={1} style={styles.studentTitle}>
            {studentName}
          </Text>
          <Text numberOfLines={1} style={styles.studentSubtitle}>
            {outcome.studentNameText
              ? `На бланке: «${outcome.studentNameText}» · Изменить`
              : 'Нажмите, чтобы выбрать другого ученика'}
          </Text>
        </View>
        <AppIcon color={colors.textMuted} name="chevronRight" size={18} />
      </Pressable>

      {!hasReview ? (
        <ZeroTouchBanner
          canSave={Boolean(student)}
          onSwipeSave={() => {
            void saveAndNextSheet();
          }}
          pristine={pristine}
        />
      ) : null}

      <ResultSummaryCard
        grade={gradeForPercent(percent, session.getState().profile?.gradingScale ?? defaultGradeScale)}
        maxScore={maxScore}
        percent={percent}
        reviewLeft={reviewLeft}
        score={score}
        studentName={studentName}
        variant={outcome.variant}
      />

      <View style={styles.section}>
        <SectionHeader
          action={
            hasReview ? (
              <Tag
                icon="review"
                label={uncertainCells > 0 ? `${uncertainCells} яч. < 85%` : `${reviewLeft} на проверку`}
                tone="mid"
              />
            ) : (
              <Tag icon="check" label="100% проверено" tone="ok" />
            )
          }
          subtitle={
            hasReview
              ? 'Нажмите жёлтый ответ — верная буква в Top-3 в 98% случаев.'
              : 'Нажмите любую строку, если хотите перепроверить ответ вручную.'
          }
          title="Ответы"
        />
        <Card style={styles.tasks}>
          {outcome.tasks.map((task, index) => {
            const override = overrides[task.number];
            const resolved = resolveTaskWithFixes(task, cellFixes);
            const status = effectiveStatus(task, override, cellFixes);
            const taskUncertain =
              status === 'review'
                ? resolved.cells.filter((c) => c.verdict === 'uncertain').length
                : 0;
            const fixedAny = resolved.cells.some((c) => c.fixedByTeacher);
            const row: AssessmentTask = {
              id: `task-${task.number}`,
              number: task.number,
              prompt: task.prompt,
              expected: task.expected,
              recognized: resolved.recognized.trim() || '—',
              status,
            };
            return (
              <TaskResultRow
                fixedByTeacher={fixedAny}
                isLast={index === outcome.tasks.length - 1}
                key={row.id}
                onPress={() => router.push(`/task-review?task=${task.number}`)}
                overridden={override}
                task={row}
                uncertainCount={taskUncertain}
              />
            );
          })}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs },
  pressed: { opacity: 0.86 },
  section: { gap: spacing.sm },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  studentBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  studentCopy: {
    flex: 1,
    gap: 2,
  },
  studentSubtitle: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  studentTitle: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.body,
  },
  tasks: { paddingBottom: spacing.xs, paddingTop: spacing.xs },
  timingText: {
    ...textStyles.caption,
    color: colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
});
