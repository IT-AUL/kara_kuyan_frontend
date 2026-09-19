import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { retryFailedSheets, useSyncState } from '@/data/syncState';
import { useTestOverview } from '@/data/testOverview';
import type { OutboxStatus } from '@/domain/sync/outbox';
import { AppIcon, Button, Chips, EmptyState, Notice, ProgressBar, Screen, ScreenHeader, StatusPill, textStyles } from '@/design-system';
import { colors, fontFamilies, hairline, radius, spacing } from '@/design-system/tokens';

const syncLabel: Record<Exclude<OutboxStatus, 'synced'>, string> = { pending: 'Ждёт отправки', syncing: 'Отправляется', failed: 'Ошибка отправки' };
const syncTone = { pending: 'neutral', syncing: 'info', failed: 'error' } as const;

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

  return (
    <Screen
      edges={['top']}
      footer={<Button disabled={!ready} icon="scan" onPress={() => router.push('/scan')} title="Сканировать лист" />}
      onRefresh={() => void ctx.refreshAll()}
      refreshing={ctx.submissionsState.status === 'loading'}
    >
      <ScreenHeader title="Проверка" />

      {ready ? (
        <Pressable
          accessibilityHint="Открывает страницу теста: итоги, задания, ученики, бланк"
          accessibilityLabel={`${ctx.assignmentTitle}, ${ctx.className}. Проверено ${o.progress.checked} из ${o.progress.total}`}
          accessibilityRole="button"
          android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }}
          onPress={() => router.push({ pathname: '/test-detail', params: { id: ctx.assignmentId ?? '' } })}
          style={styles.test}
        >
          <View style={styles.grow}>
            <Text numberOfLines={2} style={styles.testTitle}>{ctx.assignmentTitle}</Text>
            <Text style={textStyles.caption}>{ctx.className} · проверено {o.progress.checked} из {o.progress.total}</Text>
            <ProgressBar percent={o.progress.percent} />
          </View>
          <AppIcon color={colors.textFaint} name="chevronRight" size={20} />
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
          <Chips
            allLabel={`Все · ${o.rows.length}`}
            items={[{ key: 'done', label: `Проверено · ${checkedRows.length}` }, { key: 'open', label: `Осталось · ${openRows.length}` }]}
            onSelect={setFilter}
            selected={filter}
          />
          {shown.length === 0 ? (
            <Text style={textStyles.bodySmall}>{o.rows.length === 0 ? 'В классе пока нет учеников.' : 'В этом списке никого нет.'}</Text>
          ) : (
            <View style={styles.list}>
              {shown.map((r, i) => {
                const sync = localByStudent.get(r.studentId);
                const pendingSync = r.work && sync && sync.status !== 'synced' ? sync : null;
                return (
                  <View
                    accessible
                    accessibilityLabel={r.work ? `${r.name}. Оценка ${r.work.grade}, ${r.work.score} из ${r.work.maxScore}` : `${r.name}. Не проверен`}
                    key={r.studentId}
                    style={[styles.row, i < shown.length - 1 && styles.divider]}
                  >
                    <View style={[styles.avatar, !r.work && styles.avatarOpen]}>
                      <Text style={[styles.avatarText, !r.work && { color: colors.textMuted }]}>{r.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')}</Text>
                    </View>
                    <Text numberOfLines={2} style={[textStyles.body, styles.grow, !r.work && { color: colors.textMuted }]}>{r.name}</Text>
                    {r.work ? (
                      <>
                        {pendingSync ? <View style={styles.center}><StatusPill label={syncLabel[pendingSync.status as Exclude<OutboxStatus, 'synced'>]} tone={syncTone[pendingSync.status as Exclude<OutboxStatus, 'synced'>]} /></View> : null}
                        <Text style={styles.score}>{r.work.score}/{r.work.maxScore}</Text>
                        <View style={styles.grade}><Text style={styles.gradeText}>{r.work.grade}</Text></View>
                      </>
                    ) : (
                      <View style={styles.center}><StatusPill label="Не проверен" tone="neutral" /></View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  center: { alignSelf: 'center' },
  avatarOpen: { backgroundColor: colors.surfaceRaised },
  avatarText: { color: colors.successSoft, fontFamily: fontFamilies.semibold, fontSize: 14 },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: hairline },
  grade: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 32, justifyContent: 'center', width: 32 },
  gradeText: { color: colors.successSoft, fontFamily: fontFamilies.bold, fontSize: 16 },
  grow: { flex: 1 },
  list: { borderColor: colors.divider, borderTopWidth: hairline },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 64 },
  score: { color: colors.textMuted, fontFamily: fontFamilies.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  test: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.lg, borderWidth: hairline, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  testTitle: { color: colors.text, fontFamily: fontFamilies.semibold, fontSize: 17 },
});
