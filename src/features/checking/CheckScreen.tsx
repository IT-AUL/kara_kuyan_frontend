import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { demoRecentSubmissions } from '@/demo/demo-data';
import type { OutboxStatus } from '@/domain/sync/outbox';
import {
  Button,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';
import { retryFailedSheets, useSyncState } from './sync/useSyncState';

const submissionTone = {
  correct: 'success',
  pending: 'neutral',
  review: 'warning',
} as const;

const submissionLabel = {
  correct: 'Готово',
  pending: 'Не отправлено',
  review: 'На проверку',
} as const;

const syncLabel: Record<OutboxStatus, string> = {
  pending: 'Ждёт отправки',
  syncing: 'Отправляется',
  synced: 'Отправлено',
  failed: 'Ошибка отправки',
};

const syncTone = { pending: 'neutral', syncing: 'info', synced: 'success', failed: 'error' } as const;

export function CheckScreen() {
  const router = useRouter();
  const { rows, counts } = useSyncState();
  const waiting = counts.pending + counts.syncing + counts.failed;

  return (
    <Screen edges={['top']}>
      <ScreenHeader subtitle="7-А · Татар теле" title="Проверка работ" />

      <Card style={styles.hero} tone="raised">
        <Text selectable style={textStyles.title}>
          Контрольная работа №3
        </Text>
        <Text style={textStyles.bodySmall}>{18 + rows.length} из 25 проверено</Text>
        <Button
          icon="scan"
          onPress={() => router.push('/scan')}
          title="Сканировать следующий лист"
        />
        {counts.failed > 0 ? (
          <Button
            icon="arrowRight"
            onPress={() => void retryFailedSheets()}
            title={`Повторить отправку (${counts.failed})`}
            variant="secondary"
          />
        ) : null}
      </Card>

      <View style={styles.section}>
        <SectionHeader
          action={<StatusPill label={`Ожидают отправки: ${waiting}`} tone={waiting > 0 ? 'warning' : 'neutral'} />}
          title="Последние работы"
        />
        <Card style={styles.list}>
          {[...rows].reverse().map(({ submission, entry }) => (
            <ListRow
              icon="person"
              key={submission.uuid}
              right={<StatusPill label={syncLabel[entry.status]} tone={syncTone[entry.status]} />}
              subtitle={`${submission.payload.overall_score}/${submission.payload.max_score} · оценка ${submission.payload.final_grade}${
                entry.lastError && entry.status !== 'synced' ? ` · ${entry.lastError}` : ''
              }`}
              title={submission.payload.student_name}
              variant="plain"
            />
          ))}
          {demoRecentSubmissions.map(({ result, status, student }, index) => (
            <ListRow
              icon="person"
              isLast={index === demoRecentSubmissions.length - 1}
              key={student.id}
              right={<StatusPill label={submissionLabel[status]} tone={submissionTone[status]} />}
              subtitle={`${student.code} · ${result}`}
              title={student.name}
              variant="plain"
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
  },
  list: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
});
