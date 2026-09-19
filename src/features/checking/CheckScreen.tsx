import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import type { OutboxStatus } from '@/domain/sync/outbox';
import {
  Button,
  Card,
  ListRow,
  Notice,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';
import { retryFailedSheets, useSyncState } from '@/data/syncState';

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
  const ctx = useActiveContext();
  const localByUuid = new Map(rows.map((r) => [r.submission.uuid, r.entry]));
  const waiting = counts.pending + counts.syncing + counts.failed;

  return (
    <Screen edges={['top']}>
      <ScreenHeader subtitle={ctx.className ?? 'Класс не выбран'} title="Проверка работ" />

      <Card style={styles.hero} tone="raised">
        <Text selectable style={textStyles.title}>
          {ctx.assignmentTitle ?? 'Работа не выбрана'}
        </Text>
        <Text style={textStyles.bodySmall}>{ctx.progress.checkedCount} из {ctx.progress.studentCount} проверено</Text>
        <Button
          disabled={!ctx.classId || !ctx.assignmentId}
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

      {ctx.submissionsState.offline || ctx.submissionsState.status === 'error' ? (
        <Notice actionLabel="Обновить" message="Нет связи с сервером: показаны сохранённые данные." onAction={() => void ctx.refreshAll()} />
      ) : null}
      {!ctx.classId ? <Notice message="Сначала создайте класс во вкладке «Классы»." tone="info" /> : null}

      <View style={styles.section}>
        <SectionHeader
          action={<StatusPill label={`Ожидают отправки: ${waiting}`} tone={waiting > 0 ? 'warning' : 'neutral'} />}
          title="Последние работы"
        />
        <Card style={styles.list}>
          {ctx.submissions.map((sub, index) => {
            const entry = localByUuid.get(sub.uuid);
            return (
              <ListRow
                icon="person"
                isLast={index === ctx.submissions.length - 1}
                key={sub.uuid}
                right={entry && entry.status !== 'synced' ? <StatusPill label={syncLabel[entry.status]} tone={syncTone[entry.status]} /> : <StatusPill label="На сервере" tone="success" />}
                subtitle={`${sub.score}/${sub.maxScore} · оценка ${sub.grade}${entry?.lastError && entry.status !== 'synced' ? ` · ${entry.lastError}` : ''}`}
                title={sub.studentName}
                variant="plain"
              />
            );
          })}
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
