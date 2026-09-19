import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { backendApi } from '@/composition';
import { bundleResource, testsResource } from '@/data/hub';
import { session } from '@/data/session';
import { testDraft, useTestDraft } from '@/data/testDraft';
import { draftIssues, draftStats, SHEET_CAPACITY } from '@/domain/constructor/draft';
import { AppIcon, Button, Card, Field, Notice, Screen, ScreenHeader, Stepper, StatusPill, textStyles } from '@/design-system';
import { colors, radius, spacing, touchTarget } from '@/design-system/tokens';

import { AddTasks } from './components/AddTasks';
import { TaskRow } from './components/TaskRow';
import { shareBlank } from './print';

type Created = { id: string; title: string; variants: number };

/**
 * Test constructor. One screen, top to bottom: name and grade, the tasks in order (as printed, letters in
 * cells), three ways to add tasks, and a footer that always shows what will be created.
 */
export function TestFormScreen() {
  const router = useRouter();
  const draft = useTestDraft();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stats = draftStats(draft);
  const blocking = draftIssues(draft);

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
          <StatusPill icon="checkCircle" label="Тест создан" tone="success" />
          <Text style={textStyles.bodySmall}>Распечатайте бланки: на каждом свой QR-код, по нему приложение узнает работу при сканировании.</Text>
          {Array.from({ length: created.variants }, (_, i) => (
            <Button icon="print" key={i} onPress={async () => { setMessage('Готовим бланк…'); const r = await shareBlank(created.id, i + 1); setMessage(r.ok ? null : `Не удалось получить бланк: ${r.message}`); }} title={`Бланк (PDF), вариант ${i + 1}`} variant="secondary" />
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

      <Field label="Название" onChangeText={(title) => testDraft.setMeta({ title })} placeholder="Контрольная работа №4" value={draft.title} />
      <View style={styles.pair}>
        <Stepper compact label="Класс" max={9} min={5} onChange={(gradeLevel) => testDraft.setMeta({ gradeLevel })} value={draft.gradeLevel} />
        <Stepper compact label="Вариантов" max={4} min={1} onChange={(variants) => testDraft.setMeta({ variants })} value={draft.variants} />
      </View>

      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={textStyles.titleSmall}>Задания{draft.tasks.length > 0 ? ` · ${draft.tasks.length}` : ''}</Text>
        {draft.tasks.length > 0 ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => testDraft.clear()}><Text style={styles.clear}>Очистить</Text></Pressable> : null}
      </View>

      <AddTasks compact={draft.tasks.length > 0} />

      {draft.tasks.length === 0 ? (
        <Text style={styles.hint}>Можно ничего не добавлять: сервер сам подберёт задания для этого класса.</Text>
      ) : (
        <View style={styles.list}>
          {draft.tasks.map((t, i) => (
            <TaskRow
              answer={t.expectedAnswer}
              cellCount={t.cellCount}
              dense
              footer={
                <View style={styles.actions}>
                  <IconAction disabled={i === 0} label="Выше" name="arrowBack" onPress={() => testDraft.moveTask(t.taskId, -1)} rotate="90deg" />
                  <IconAction disabled={i === draft.tasks.length - 1} label="Ниже" name="arrowBack" onPress={() => testDraft.moveTask(t.taskId, 1)} rotate="-90deg" />
                  <View style={styles.spacer} />
                  <IconAction label="Убрать задание" name="close" onPress={() => testDraft.removeTask(t.taskId)} />
                </View>
              }
              index={i + 1}
              key={t.taskId}
              prompt={t.prompt}
              topicName={t.topicName}
            />
          ))}
        </View>
      )}

      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}

function IconAction({ name, label, onPress, disabled = false, rotate }: { name: 'arrowBack' | 'close'; label: string; onPress: () => void; disabled?: boolean; rotate?: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      android_ripple={{ borderless: true, color: 'rgba(244, 248, 245, 0.12)' }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.icon, disabled && styles.iconOff]}
    >
      <View style={rotate ? { transform: [{ rotate }] } : undefined}>
        <AppIcon color={colors.textMuted} name={name} size={20} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: 'center', borderColor: colors.divider, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: spacing.xs },
  adders: { gap: spacing.xs },
  clear: { color: colors.textMuted, fontSize: 14, fontWeight: '600', padding: spacing.xs },
  done: { gap: spacing.sm },
  footer: { gap: spacing.xs },
  icon: { alignItems: 'center', borderRadius: radius.md, height: touchTarget, justifyContent: 'center', width: touchTarget },
  iconOff: { opacity: 0.3 },
  list: { gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.sm },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  spacer: { flex: 1 },
  hint: { color: colors.textFaint, fontSize: 13, textAlign: 'center' },
  summary: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
