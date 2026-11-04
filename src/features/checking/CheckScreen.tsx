import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { retryFailedSheets, useSyncState } from '@/data/syncState';
import { useTestOverview } from '@/data/testOverview';
import type { OutboxStatus } from '@/domain/sync/outbox';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  GradePill,
  Notice,
  ProgressStrip,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  Tag,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, fontSizes, hairline, spacing } from '@/design-system/tokens';

const syncLabel: Record<Exclude<OutboxStatus, 'synced'>, string> = {
  pending: 'Ждёт отправки',
  syncing: 'Отправляется',
  failed: 'Ошибка отправки',
};
const syncTone: Record<Exclude<OutboxStatus, 'synced'>, 'neutral' | 'info' | 'bad'> = {
  pending: 'neutral',
  syncing: 'info',
  failed: 'bad',
};

const clampGrade = (g: number): 2 | 3 | 4 | 5 => Math.min(5, Math.max(2, Math.round(g))) as 2 | 3 | 4 | 5;

/**
 * The checking queue of the current test: every student of the class with their state. The overall test
 * (results, tasks, blank) lives on the test page; here the teacher sees who is done and scans the next sheet.
 */
export function CheckScreen() {
  const router = useRouter();
  const { rows: localRows, counts } = useSyncState();
  const ctx = useActiveContext();
  const o = useTestOverview(ctx.assignmentId);
  const [filter, setFilter] = useState<string | null>(null);
  const localByStudent = new Map(localRows.map((r) => [`${r.submission.payload.student_id}`, r.entry]));

  const ready = !!ctx.classId && !!ctx.assignmentId;
  const checkedRows = o.rows.filter((r) => r.work !== null);
  const openRows = o.rows.filter((r) => r.work === null);
  const shown = filter === 'done' ? checkedRows : filter === 'open' ? openRows : o.rows;
  const activeTabIndex = filter === 'open' ? 1 : filter === 'done' ? 2 : 0;
  const headerTitle = ready ? `${ctx.assignmentTitle} · ${ctx.className}` : 'Проверка';
  const allChecked = ready && o.progress.total > 0 && o.progress.remaining === 0;

  return (
    <Screen
      edges={['top']}
      footer={
        <>
          {allChecked ? (
            <Button
              onPress={() => router.push('/check-done')}
              title="Класс проверен — итоги"
              variant="secondary"
            />
          ) : null}
          <Button disabled={!ready} icon="scan" onPress={() => router.push('/scan')} title="Сканировать лист" />
        </>
      }
      onRefresh={() => void ctx.refreshAll()}
      refreshing={ctx.submissionsState.status === 'loading'}
    >
      <ScreenHeader title={headerTitle} />

      {ready ? (
        <Pressable
          accessibilityHint="Открывает страницу теста: итоги, задания, ученики, бланк"
          accessibilityLabel={`${ctx.assignmentTitle}, ${ctx.className}. Проверено ${o.progress.checked} из ${o.progress.total}`}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/test-detail', params: { id: ctx.assignmentId ?? '' } })}
          style={styles.progressBlock}
        >
          <View style={styles.progressRow}>
            <Text style={styles.progressLeft}>
              <Text style={styles.checkedCount}>{o.progress.checked}</Text>
              <Text style={styles.checkedLabel}>{` из ${o.progress.total} проверено`}</Text>
            </Text>
            <Text style={textStyles.caption}>
              {o.progress.remaining > 0 ? `осталось ${o.progress.remaining}` : 'все сдали'}
            </Text>
          </View>
          <ProgressStrip done={o.progress.checked} total={o.progress.total} />
        </Pressable>
      ) : null}

      {ctx.submissionsState.offline || ctx.submissionsState.status === 'error' ? (
        <Notice actionLabel="Обновить" message="Нет связи с сервером: показаны сохранённые данные." onAction={() => void ctx.refreshAll()} />
      ) : null}
      {counts.failed > 0 ? (
        <Notice actionLabel="Повторить" message={`Не отправлено работ: ${counts.failed}. Они сохранены на телефоне.`} onAction={() => void retryFailedSheets()} tone="error" />
      ) : null}

      {!ready ? (
        <EmptyState
          actionLabel={ctx.classId ? 'Выбрать тест' : 'Создать класс'}
          body={ctx.classId ? 'Выберите тест, который проверяете.' : 'Сначала создайте класс и добавьте учеников.'}
          icon="scan"
          onAction={() => router.push(ctx.classId ? '/assignments' : '/class-form')}
          title="Нечего проверять"
        />
      ) : (
        <>
          <SegmentedTabs
            activeIndex={activeTabIndex}
            onTabChange={(index) => setFilter(index === 1 ? 'open' : index === 2 ? 'done' : null)}
            tabs={[
              `Все ${o.progress.total}`,
              `Осталось ${o.progress.remaining}`,
              `Проверено ${o.progress.checked}`,
            ]}
          />
          {shown.length === 0 ? (
            <Text style={textStyles.bodySmall}>{o.rows.length === 0 ? 'В классе пока нет учеников.' : 'В этом списке никого нет.'}</Text>
          ) : (
            <Card style={styles.listCard}>
              {shown.map((r, i) => {
                const sync = localByStudent.get(r.studentId);
                const pendingSync =
                  r.work && sync && sync.status !== 'synced'
                    ? (sync.status as Exclude<OutboxStatus, 'synced'>)
                    : null;
                return (
                  <View
                    accessible
                    accessibilityLabel={r.work ? `${r.name}. Оценка ${r.work.grade}, ${r.work.score} из ${r.work.maxScore}` : `${r.name}. Не сдал`}
                    key={r.studentId}
                    style={[styles.row, i < shown.length - 1 && styles.divider]}
                  >
                    <Avatar name={r.name} ring={r.work ? 'done' : 'none'} size={36} />
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={2} style={[styles.studentName, !r.work && styles.studentNameOpen]}>
                        {r.name}
                      </Text>
                      {pendingSync ? (
                        <Tag label={syncLabel[pendingSync]} tone={syncTone[pendingSync]} />
                      ) : (
                        <Text style={textStyles.caption}>
                          {r.work ? `${r.work.score} из ${r.work.maxScore}` : 'не сдал'}
                        </Text>
                      )}
                    </View>
                    {r.work ? (
                      <GradePill grade={clampGrade(r.work.grade)} />
                    ) : (
                      <Text style={styles.dash}>—</Text>
                    )}
                  </View>
                );
              })}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkedCount: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.display,
    fontVariant: ['tabular-nums'],
    lineHeight: 36,
  },
  checkedLabel: {
    ...textStyles.body,
    color: colors.textMuted,
  },
  dash: {
    ...textStyles.bodySmall,
    color: colors.textFaint,
  },
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  listCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progressLeft: {
    flexShrink: 1,
  },
  progressRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 60,
    paddingVertical: spacing.sm,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.bodySmall,
    lineHeight: 20,
  },
  studentNameOpen: {
    color: colors.textMuted,
  },
});
