import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { session } from '@/data/session';
import { defaultGradeScale, gradeForPercent, scorePercent } from '@/domain/assessment/grading';
import type { AssessmentTask } from '@/domain/assessment/model';
import { effectiveStatus, scoreOutcome } from '@/domain/scan/evaluate';
import { Button, Card, Screen, ScreenHeader, SectionHeader, StatusPill } from '@/design-system';
import { spacing } from '@/design-system/tokens';
import { ResultSummaryCard } from './components/ResultSummaryCard';
import { TaskResultRow } from './components/TaskResultRow';
import { scanSession, useScanSession } from './scanSession';

export function AssessmentResultScreen() {
  const router = useRouter();
  const { outcome, overrides, student } = useScanSession();

  if (!outcome) {
    return (
      <Screen footer={<Button icon="scan" onPress={() => router.replace('/checking')} title="К проверке" />}>
        <ScreenHeader eyebrow="Результат" title="Нет результата" subtitle="Сначала отсканируйте лист." />
      </Screen>
    );
  }

  const { score, maxScore, reviewLeft } = scoreOutcome(outcome, overrides);
  const percent = scorePercent(score, maxScore);
  const hasReview = reviewLeft > 0;

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <StatusPill icon="time" label="Не сохранено" tone="neutral" />
          {hasReview ? (
            <Button icon="review" onPress={() => router.push('/task-review')} title="Проверить отмеченный ответ" />
          ) : (
            <Button
              icon="check"
              onPress={async () => {
                await scanSession.save();
                router.replace('/checking');
              }}
              title="Сохранить и сканировать дальше"
            />
          )}
        </View>
      }
    >
      <ScreenHeader
        eyebrow="Результат"
        showBack
        subtitle={student ? `${student.name} · ${student.code}` : 'Ученик не выбран'}
        title="Работа проверена"
      />

      <ResultSummaryCard
        grade={gradeForPercent(percent, session.getState().profile?.gradingScale ?? defaultGradeScale)}
        maxScore={maxScore}
        percent={percent}
        reviewLeft={reviewLeft}
        score={score}
        variant={outcome.variant}
      />

      <View style={styles.section}>
        <SectionHeader
          action={hasReview ? <StatusPill label={`${reviewLeft} на проверку`} tone="warning" /> : undefined}
          subtitle={
            hasReview ? 'Проверьте отмеченный ответ перед сохранением.' : 'Все ответы проверены — работу можно сохранить.'
          }
          title="Ответы"
        />
        <Card style={styles.tasks}>
          {outcome.tasks.map((task, index) => {
            const override = overrides[task.number];
            const row: AssessmentTask = {
              id: `task-${task.number}`,
              number: task.number,
              prompt: task.prompt,
              expected: task.expected,
              recognized: task.recognized.trim() || '—',
              status: effectiveStatus(task, override),
            };
            return (
              <TaskResultRow
                isLast={index === outcome.tasks.length - 1}
                key={row.id}
                overridden={override}
                task={row}
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
  section: { gap: spacing.sm },
  tasks: { paddingBottom: spacing.xs, paddingTop: spacing.xs },
});
