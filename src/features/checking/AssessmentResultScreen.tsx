import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { demoSheet } from '@/demo/demo-data';
import { Button, Card, Screen, ScreenHeader, SectionHeader, StatusPill } from '@/design-system';
import { spacing } from '@/design-system/tokens';
import { ResultSummaryCard } from './components/ResultSummaryCard';
import { TaskResultRow } from './components/TaskResultRow';

export function AssessmentResultScreen() {
  const router = useRouter();
  const { reviewed } = useLocalSearchParams<{ reviewed?: string }>();
  const reviewCount = demoSheet.tasks.filter((task) => task.status === 'review').length;
  const hasReview = reviewed !== '1' && reviewCount > 0;

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <StatusPill icon="time" label="Не сохранено" tone="neutral" />
          {hasReview ? (
            <Button
              icon="review"
              onPress={() => router.push('/task-review')}
              title="Проверить отмеченный ответ"
            />
          ) : (
            <Button
              icon="check"
              onPress={() => router.replace('/checking')}
              title="Сохранить и сканировать дальше"
            />
          )}
        </View>
      }
    >
      <ScreenHeader
        eyebrow="Результат"
        showBack
        subtitle={`${demoSheet.student.name} · ${demoSheet.student.code}`}
        title="Работа проверена"
      />

      <ResultSummaryCard />

      <View style={styles.section}>
        <SectionHeader
          action={
            hasReview ? <StatusPill label={`${reviewCount} на проверку`} tone="warning" /> : undefined
          }
          subtitle={
            hasReview
              ? 'Проверьте отмеченный ответ перед сохранением.'
              : 'Все ответы проверены — работу можно сохранить.'
          }
          title="Ответы"
        />
        <Card style={styles.tasks}>
          {demoSheet.tasks.map((task, index) => (
            <TaskResultRow
              isLast={index === demoSheet.tasks.length - 1}
              key={task.id}
              reviewed={!hasReview && task.status === 'review'}
              task={task}
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  tasks: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
});
