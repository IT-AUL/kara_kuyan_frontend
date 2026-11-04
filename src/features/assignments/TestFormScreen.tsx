import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { backendApi } from '@/composition';
import { bankResource, bundleResource, testsResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { session } from '@/data/session';
import { testDraft, useTestDraft } from '@/data/testDraft';
import { draftIssues, draftStats, SHEET_CAPACITY, uniqueTopics } from '@/domain/constructor/draft';
import { AppIcon, Button, Card, Field, Notice, Screen, ScreenHeader, Stepper, Tag, textStyles } from '@/design-system';
import { colors, fontFamilies, fontSizes, radius, spacing, touchTarget } from '@/design-system/tokens';

import { AddTasks } from './components/AddTasks';
import { TaskRow } from './components/TaskRow';
import { shareBlank } from './print';

type Created = { id: string; title: string; variants: number };

/**
 * Test constructor. One screen, top to bottom: name and grade, the tasks in order (as printed, letters in
 * cells), ways to add tasks, and a footer that always shows what will be created.
 */
export function TestFormScreen() {
  const router = useRouter();
  const draft = useTestDraft();
  const bank = useResource(bankResource);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stats = draftStats(draft);
  const blocking = draftIssues(draft);
  const topics = useMemo(
    () => uniqueTopics(draft.tasks.length > 0 ? draft.tasks : (bank.data ?? [])),
    [draft.tasks, bank.data],
  );
  const activeTopic = topicFilter && topics.some((t) => t.tag === topicFilter) ? topicFilter : null;
  const shownTasks = useMemo(
    () => (activeTopic ? draft.tasks.filter((t) => t.topicTag === activeTopic) : draft.tasks),
    [draft.tasks, activeTopic],
  );

  const submit = async () => {
    if (!backendApi || blocking.length > 0) return;
    setBusy(true);
    setError(null);
    const result = await backendApi.assembleTest({
      title: draft.title.trim(),
      gradeLevel: draft.gradeLevel,
      variants: draft.variants,
      taskIds: draft.tasks.length > 0 ? draft.tasks.map((t) => t.taskId) : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError('Не удалось создать тест: сервер не принял запрос или не ответил. Черновик сохранён.');
      return;
    }
    bundleResource(result.value.assignmentId).put(result.value);
    const classId = session.getState().activeClassId;
    // a new test goes to the class the teacher is working with, so it shows up as assigned with progress
    if (classId) await backendApi.assignToClass(classId, result.value.assignmentId);
    await testsResource.refresh();
    session.selectAssignment(result.value.assignmentId);
    testDraft.clear();
    setCreated({ id: result.value.assignmentId, title: result.value.title, variants: result.value.variants.length });
  };

  if (created) {
    return (
      <Screen
        footer={
          <Button
            icon="scan"
            onPress={() => {
              router.dismissAll();
              router.push('/checking');
            }}
            title="Проверять этот тест"
          />
        }
      >
        <ScreenHeader eyebrow="Готово" subtitle="Тест сохранён на сервере и стал текущим." title={created.title} />
        <Card style={styles.done} tone="raised">
          <Tag icon="checkCircle" label="Тест создан" tone="ok" />
          <Text style={textStyles.bodySmall}>Распечатайте бланки: на каждом свой QR-код, по нему приложение узнает работу при сканировании.</Text>
          {Array.from({ length: created.variants }, (_, i) => (
            <Button
              icon="print"
              key={i}
              onPress={async () => {
                setMessage('Готовим бланк…');
                const r = await shareBlank(created.id, i + 1);
                setMessage(r.ok ? null : `Не удалось получить бланк: ${r.message}`);
              }}
              title={`Бланк (PDF), вариант ${i + 1}`}
              variant="secondary"
            />
          ))}
        </Card>
        {message ? <Notice message={message} tone="info" /> : null}
        <Button icon="task" onPress={() => { setCreated(null); }} title="Создать ещё один тест" variant="ghost" />
        <Button icon="library" onPress={() => { router.dismissAll(); router.push({ pathname: '/test-detail', params: { id: created.id } }); }} title="Открыть тест" variant="ghost" />
      </Screen>
    );
  }

  return (
    <Screen
      avoidKeyboard
      footer={
        <View style={styles.footer}>
          <Text style={styles.summary}>
            {stats.taskCount === 0
              ? 'Задания подберёт сервер'
              : `${stats.taskCount} заданий · ${stats.cellCount} клеток${stats.fitsOneSheet ? '' : ` · больше ${SHEET_CAPACITY}: не поместится на листе`}`}
          </Text>
          <Button disabled={blocking.length > 0 || busy} icon="check" onPress={() => void submit()} title={busy ? 'Создаём…' : 'Создать тест'} />
        </View>
      }
    >
      <ScreenHeader showBack size="compact" title="Новый тест" />

      {topics.length > 0 ? (
        <ScrollView contentContainerStyle={styles.chipsRow} horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            accessibilityLabel="Все темы"
            accessibilityRole="button"
            accessibilityState={{ selected: activeTopic === null }}
            hitSlop={5}
            onPress={() => setTopicFilter(null)}
            style={[styles.pillChip, activeTopic === null && styles.pillChipActive]}
          >
            <Text numberOfLines={1} style={[styles.pillChipText, activeTopic === null && styles.pillChipTextActive]}>
              Все темы
            </Text>
          </Pressable>
          {topics.map((t) => {
            const on = activeTopic === t.tag;
            return (
              <Pressable
                accessibilityLabel={t.name}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                hitSlop={5}
                key={t.tag}
                onPress={() => setTopicFilter(on ? null : t.tag)}
                style={[styles.pillChip, on && styles.pillChipActive]}
              >
                <Text numberOfLines={1} style={[styles.pillChipText, on && styles.pillChipTextActive]}>
                  {t.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.headerBlock}>
        <Text accessibilityRole="header" style={textStyles.title}>
          {draft.title.trim() || 'Новый тест'}
        </Text>
        <Text style={textStyles.caption}>{`${stats.taskCount} заданий · ${draft.gradeLevel} класс`}</Text>
      </View>

      <Field label="Название" onChangeText={(title) => testDraft.setMeta({ title })} placeholder="Контрольная работа №4" value={draft.title} />
      <View style={styles.pair}>
        <Stepper compact label="Класс" max={9} min={5} onChange={(gradeLevel) => testDraft.setMeta({ gradeLevel })} value={draft.gradeLevel} />
        <Stepper compact label="Вариантов" max={4} min={1} onChange={(variants) => testDraft.setMeta({ variants })} value={draft.variants} />
      </View>

      {shownTasks.length === 0 ? (
        <Text style={styles.hint}>Можно ничего не добавлять: сервер сам подберёт задания для этого класса.</Text>
      ) : (
        <Card style={styles.tasksCard}>
          {shownTasks.map((t, i) => (
            <TaskRow
              actionLabel="Убрать задание"
              answer={t.expectedAnswer}
              cellCount={t.cellCount}
              dense
              index={i + 1}
              key={t.taskId}
              last={i === shownTasks.length - 1}
              onAction={() => testDraft.removeTask(t.taskId)}
              prompt={t.prompt}
              topicName={t.topicName}
            />
          ))}
        </Card>
      )}

      <View style={styles.sectionHead}>
        <Pressable
          accessibilityLabel="Добавить задание"
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => router.push('/task-picker')}
          style={styles.addBtn}
        >
          <AppIcon color={colors.primary} name="add" size={18} />
          <Text style={styles.addBtnText}>Добавить задание</Text>
        </Pressable>
        {draft.tasks.length > 0 ? (
          <Pressable
            accessibilityLabel="Очистить задания"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => testDraft.clear()}
            style={styles.clearBtn}
          >
            <Text style={styles.clear}>Очистить</Text>
          </Pressable>
        ) : null}
      </View>

      <AddTasks compact={draft.tasks.length > 0} />

      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: touchTarget,
    paddingVertical: spacing.xs,
  },
  addBtnText: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.bodySmall,
  },
  chipsRow: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  clear: {
    color: colors.textMuted,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.bodySmall,
  },
  clearBtn: {
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xs,
  },
  done: { gap: spacing.sm },
  footer: { gap: spacing.xs },
  headerBlock: {
    gap: spacing.xxs,
  },
  hint: { color: colors.textFaint, fontSize: fontSizes.caption, textAlign: 'center' },
  pair: { flexDirection: 'row', gap: spacing.sm },
  pillChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pillChipActive: {
    backgroundColor: colors.text,
  },
  pillChipText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.bodySmall,
  },
  pillChipTextActive: {
    color: colors.background,
    fontFamily: fontFamilies.semibold,
  },
  sectionHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summary: { color: colors.textMuted, fontSize: fontSizes.bodySmall, textAlign: 'center' },
  tasksCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
});
