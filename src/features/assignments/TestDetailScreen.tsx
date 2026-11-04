import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { backendApi } from '@/composition';
import { classAssignmentsResource, testsResource } from '@/data/hub';
import { hiddenTests, useHiddenTests } from '@/data/hiddenTests';
import { session } from '@/data/session';
import { useTestOverview } from '@/data/testOverview';
import { percentOf } from '@/domain/tests/summary';
import {
  AppIcon,
  Avatar,
  BarChart,
  Button,
  Card,
  EmptyState,
  GradePill,
  HeroCard,
  Notice,
  ProgressStrip,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedTabs,
  Tag,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, fontSizes, hairline, radius, spacing } from '@/design-system/tokens';

import { TaskRow } from './components/TaskRow';
import { shareBlank, shareClassBlanks } from './print';

const TABS = ['Итоги', 'Задания', 'Ученики', 'Бланк'] as const;

/**
 * The hub of one test: results, tasks with how they went, who has been checked, and the blank to print.
 * Everything a teacher wants to know about a test lives here, one tap from the Tests list.
 */
export function TestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ctx = useActiveContext();
  const o = useTestOverview(id ?? null);
  const hidden = useHiddenTests().includes(id);
  const [tab, setTab] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const test = ctx.tests.find((t) => t.testId === id);
  const isCurrent = ctx.assignmentId === id;
  const serverAssignment = ctx.classAssignments.find((a) => a.assignmentId === id);
  const assigned = !!serverAssignment || (!!test?.assignedClasses && !!ctx.classId && test.assignedClasses.includes(ctx.classId));
  const due = serverAssignment?.dueDate ? new Date(serverAssignment.dueDate) : null;
  const dueText = due && !Number.isNaN(due.getTime()) ? due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : null;
  const [assigning, setAssigning] = useState(false);
  const variants = o.bundle?.variants ?? [];
  const variant = variants[Math.min(variantIndex, Math.max(variants.length - 1, 0))];
  const hitsByTask = new Map(o.hits.map((h) => [h.number, h]));
  const serverByTask = new Map((o.analytics?.questions ?? []).map((q) => [q.number, q]));

  const scan = () => {
    session.selectAssignment(id);
    router.push('/scan');
  };
  const assign = async () => {
    if (!backendApi || !ctx.classId) return;
    setAssigning(true);
    const r = await backendApi.assignToClass(ctx.classId, id);
    if (r.ok) await Promise.all([testsResource.refresh(), classAssignmentsResource(ctx.classId).refresh()]);
    setAssigning(false);
    setMessage(r.ok ? null : 'Не удалось назначить тест классу: сервер не принял запрос.');
  };
  const printClass = async () => {
    if (!ctx.classId) return;
    setMessage('Готовим бланки для класса…');
    const r = await shareClassBlanks(ctx.classId, id);
    setMessage(r.ok ? null : `Не удалось получить бланки: ${r.message}`);
  };
  const print = async () => {
    if (!variant) return;
    setMessage('Готовим бланк…');
    const r = await shareBlank(id, variant.variantId);
    setMessage(r.ok ? null : `Не удалось получить бланк: ${r.message}`);
  };

  const titleText = test?.title ?? o.bundle?.title ?? 'Тест';
  const metaParts = [
    ctx.className || null,
    test ? `${test.gradeLevel} класс` : null,
    test ? `${test.questionsCount} заданий` : null,
  ].filter(Boolean);

  return (
    <Screen
      onRefresh={() => void o.refresh()}
      refreshing={o.bundleState.status === 'loading'}
    >
      <ScreenHeader showBack size="compact" titleLines={2} title={titleText} />

      <HeroCard>
        <View style={styles.heroBody}>
          <View style={styles.pills}>
            {isCurrent ? <Tag icon="checkCircle" label="Текущий тест" tone="ok" /> : null}
            {assigned ? <Tag icon="classes" label={`Назначен: ${ctx.className}`} tone="neutral" /> : null}
            {dueText ? <Tag icon="time" label={`Срок: ${dueText}`} tone="mid" /> : null}
            {serverAssignment && ['completed', 'closed', 'archived', 'done', 'finished'].includes(serverAssignment.status.toLowerCase()) ? (
              <Tag label="Завершён" tone="neutral" />
            ) : null}
          </View>

          <Text numberOfLines={2} style={textStyles.title}>
            {titleText}
          </Text>
          {metaParts.length > 0 ? <Text style={textStyles.bodySmall}>{metaParts.join(' · ')}</Text> : null}

          <View style={styles.progressHead}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressCount}>{o.progress.checked}</Text>
              <Text style={textStyles.bodySmall}>{` из ${o.progress.total} проверено`}</Text>
            </View>
            <Text style={textStyles.bodySmall}>
              {o.average !== null ? `средний ${o.average}%` : o.progress.remaining > 0 ? `осталось ${o.progress.remaining}` : 'все проверены'}
            </Text>
          </View>

          <ProgressStrip done={o.progress.checked} total={o.progress.total} />

          <View style={styles.heroActions}>
            <Button disabled={!variant || !ctx.classId} icon="scan" onPress={scan} title="Сканировать" variant="primary" />
            <View style={styles.secondaryActions}>
              <View style={styles.grow}>
                <Button
                  compact
                  disabled={!variant && !ctx.classId}
                  icon="print"
                  onPress={() => {
                    setTab(3);
                    if (ctx.classId) void printClass();
                    else void print();
                  }}
                  title="Бланки"
                  variant="secondary"
                />
              </View>
              <View style={styles.grow}>
                <Button compact icon="analytics" onPress={() => setTab(0)} title="Итоги" variant="secondary" />
              </View>
            </View>
          </View>
        </View>
      </HeroCard>

      {ctx.classId && test?.assignedClasses && !assigned ? (
        <Button disabled={assigning} icon="classes" onPress={() => void assign()} title={assigning ? 'Назначаем…' : `Назначить классу ${ctx.className}`} variant="secondary" />
      ) : null}
      {o.offline ? <Notice message="Нет связи: показаны сохранённые данные." /> : null}

      <SegmentedTabs activeIndex={tab} onTabChange={setTab} tabs={TABS} />

      {tab === 0 ? (
        o.works.length === 0 ? (
          <EmptyState body="Как только вы проверите первый лист, здесь появятся оценки и сложные задания." icon="analytics" title="Пока нет результатов" />
        ) : (
          <View style={styles.block}>
            <Card style={styles.chart}>
              <BarChart bars={(['5', '4', '3', '2'] as const).map((g) => ({ label: `«${g}»`, value: o.grades[g] }))} title="Оценки" valueSuffix="" />
            </Card>
            {o.hits.length > 0 ? (
              <View style={styles.block}>
                <SectionHeader subtitle="Где чаще ошибались" title="Сложные задания" />
                <Card style={styles.list}>
                  {[...o.hits].sort((a, b) => a.correct / a.total - b.correct / b.total).slice(0, 3).map((h, i, list) => {
                    const q = variant?.questions.find((x) => x.questionNumber === h.number);
                    return (
                      <View key={h.number} style={[styles.hardRow, i < list.length - 1 && styles.divider]}>
                        <Text style={styles.number}>{h.number}</Text>
                        <Text numberOfLines={2} style={[textStyles.bodySmall, styles.grow]}>{q?.prompt ?? `Задание ${h.number}`}</Text>
                        <Text style={styles.hit}>{h.correct}/{h.total}</Text>
                      </View>
                    );
                  })}
                </Card>
              </View>
            ) : null}
          </View>
        )
      ) : null}

      {tab === 1 ? (
        <View style={styles.block}>
          {variants.length > 1 ? <SegmentedTabs activeIndex={variantIndex} onTabChange={setVariantIndex} tabs={variants.map((v) => `Вариант ${v.variantId}`)} /> : null}
          {o.bundleState.status === 'error' && !o.bundle ? (
            <EmptyState body="Сервер не отдал состав этого теста. Попробуйте позже." icon="library" title="Состав недоступен" />
          ) : (
            <Card style={styles.tasksCard}>
              {(variant?.questions ?? []).map((q, idx, list) => {
                const hit = hitsByTask.get(q.questionNumber);
                const server = serverByTask.get(q.questionNumber);
                return (
                  <TaskRow
                    answer={q.expectedAnswer}
                    cellCount={q.expectedCells.length}
                    dense
                    index={q.questionNumber}
                    key={q.questionNumber}
                    last={idx === list.length - 1}
                    prompt={q.prompt}
                    right={
                      hit ? (
                        <Tag label={`${hit.correct}/${hit.total}`} tone={hit.correct === hit.total ? 'ok' : 'mid'} />
                      ) : server && server.accuracyPct > 0 ? (
                        <Tag label={`${Math.round(server.accuracyPct)}%`} tone="neutral" />
                      ) : undefined
                    }
                    topicName={q.topicName ?? q.topicTag}
                  />
                );
              })}
            </Card>
          )}
        </View>
      ) : null}

      {tab === 2 ? (
        <View style={styles.block}>
          {!ctx.classId ? <Notice message="Сначала создайте класс, чтобы увидеть учеников." tone="info" /> : null}
          <Card style={styles.list}>
            {o.rows.map((r, i) => {
              const open = openStudent === r.studentId && r.work !== null;
              const safeGrade = r.work ? (Math.min(5, Math.max(2, Math.round(r.work.grade))) as 2 | 3 | 4 | 5) : null;
              return (
                <View key={r.studentId} style={i < o.rows.length - 1 ? styles.divider : undefined}>
                  <Pressable
                    accessibilityLabel={r.work ? `${r.name}. Оценка ${r.work.grade}, ${r.work.score} из ${r.work.maxScore}` : `${r.name}. Не проверен`}
                    accessibilityRole="button"
                    disabled={r.work === null}
                    onPress={() => setOpenStudent(open ? null : r.studentId)}
                    style={styles.studentRow}
                  >
                    <Avatar name={r.name} ring={r.work ? 'done' : 'none'} size={36} />
                    <Text numberOfLines={2} style={[textStyles.body, styles.grow]}>{r.name}</Text>
                    {r.work && safeGrade ? (
                      <>
                        <Text style={styles.score}>{r.work.score}/{r.work.maxScore}</Text>
                        <GradePill grade={safeGrade} />
                        <AppIcon color={colors.textFaint} name={open ? 'arrowBack' : 'chevronRight'} size={18} />
                      </>
                    ) : (
                      <View style={styles.center}><Tag label="Не проверен" tone="neutral" /></View>
                    )}
                  </Pressable>
                  {open && r.work?.tasks ? (
                    <View style={styles.tasks}>
                      {r.work.tasks.map((t) => (
                        <View accessible accessibilityLabel={`Задание ${t.number}: ${t.correct ? 'верно' : 'ошибка'}`} key={t.number} style={[styles.taskChip, t.correct ? styles.taskOk : styles.taskBad]}>
                          <Text style={[styles.taskText, { color: t.correct ? colors.successSoft : colors.error }]}>{t.number} {t.correct ? '✓' : '✕'}</Text>
                        </View>
                      ))}
                      <Text style={textStyles.caption}>{percentOf(r.work)}%</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {tab === 3 ? (
        <View style={styles.block}>
          <Card style={styles.list}>
            <View style={styles.printBox}>
              <Text style={textStyles.bodySmall}>На бланке у каждого варианта свой QR-код: по нему приложение узнаёт работу при сканировании.</Text>
              {variants.length > 1 ? <SegmentedTabs activeIndex={variantIndex} onTabChange={setVariantIndex} tabs={variants.map((v) => `Вариант ${v.variantId}`)} /> : null}
              <Button disabled={!variant} icon="print" onPress={() => void print()} title={variant ? `Бланк (PDF), вариант ${variant.variantId}` : 'Бланк'} variant="secondary" />
              {ctx.classId ? <Button icon="classes" onPress={() => void printClass()} title={`Бланки на весь класс ${ctx.className}`} variant="secondary" /> : null}
              {ctx.classId ? <Text style={textStyles.caption}>В PDF у каждого ученика свой бланк с подписанным именем.</Text> : null}
            </View>
          </Card>
          {message ? <Notice message={message} tone="info" /> : null}
          {!isCurrent ? (
            <>
              <Button icon={hidden ? 'sync' : 'close'} onPress={() => { if (hidden) hiddenTests.unhide(id); else { hiddenTests.hide(id); router.back(); } }} title={hidden ? 'Вернуть в список' : 'Скрыть из списка'} variant="ghost" />
              <Text style={textStyles.caption}>Тест не удаляется с сервера, он лишь скрывается на этом телефоне.</Text>
            </>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  center: { alignSelf: 'center' },
  chart: { gap: spacing.sm },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: hairline },
  grow: { flex: 1 },
  hardRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  heroActions: { gap: spacing.xs, marginTop: spacing.xs },
  heroBody: { gap: spacing.sm },
  hit: { color: colors.warning, fontFamily: fontFamilies.bold, fontSize: fontSizes.body, fontVariant: ['tabular-nums'] },
  list: { paddingHorizontal: 0, paddingVertical: 0 },
  number: { color: colors.textMuted, fontFamily: fontFamilies.semibold, fontSize: fontSizes.bodySmall, minWidth: 18 },
  pills: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  printBox: { gap: spacing.sm, padding: spacing.md },
  progressCount: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.display,
    fontVariant: ['tabular-nums'],
  },
  progressHead: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  progressLeft: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  score: { color: colors.textMuted, fontFamily: fontFamilies.semibold, fontSize: fontSizes.bodySmall, fontVariant: ['tabular-nums'] },
  secondaryActions: { flexDirection: 'row', gap: spacing.xs },
  studentRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  taskBad: { backgroundColor: colors.errorSoft },
  taskChip: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  taskOk: { backgroundColor: colors.primarySoft },
  taskText: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.caption },
  tasks: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  tasksCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
});
