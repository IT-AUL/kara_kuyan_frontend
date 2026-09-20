import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { TaskBankEntry } from '@/adapters/api/backend';
import { scanExercisePhoto, type PhotoSource } from '@/adapters/media/task-photo';
import { backendApi, kvStore } from '@/composition';
import { bankResource, manifestResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { testDraft, useTestDraft } from '@/data/testDraft';
import { customTaskIssueText, defaultCells, MAX_CELLS, validateCustomTask } from '@/domain/constructor/draft';
import { AppIcon, Button, Card, Field, Notice, Screen, ScreenHeader, StatusPill, textStyles } from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';

import { TaskRow } from './components/TaskRow';

const CONSENT_KEY = 'task-photo-consent';

type Item = { task: TaskBankEntry; on: boolean; answer: string };

/**
 * Tasks from a photo of a textbook exercise (ADR 0009). The photo goes to the server and an external recognition
 * service: an explicit notice comes first. Results are AI output: the teacher reviews and may edit each answer,
 * and only approved tasks are written to the bank.
 */
export function TaskPhotoScreen() {
  const router = useRouter();
  const draft = useTestDraft();
  const manifest = useResource(manifestResource);
  const [consented, setConsented] = useState(() => kvStore.get(CONSENT_KEY) === '1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [rawText, setRawText] = useState('');
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const scan = async (source: PhotoSource) => {
    if (!backendApi) return;
    setBusy(true);
    setError(null);
    setUnsupported(null);
    const target = await backendApi.scanTaskTarget(draft.gradeLevel);
    const outcome = await scanExercisePhoto(source, target);
    setBusy(false);
    if (outcome.kind === 'cancelled') return;
    if (outcome.kind === 'denied') return setError('Нет доступа к камере. Разрешите его в настройках телефона или выберите фото из галереи.');
    if (outcome.kind === 'failed') return setError(`Не удалось распознать фото: ${outcome.message}`);
    const { result } = outcome;
    setRawText(result.rawText);
    if (!result.supported || result.tasks.length === 0) {
      setUnsupported(result.unsupportedReason ?? 'В этом упражнении не нашлось заданий, которые подходят для бланка.');
      return;
    }
    setItems(result.tasks.map((task) => ({ task, on: true, answer: task.expectedAnswer })));
  };

  const problems = (i: Item) =>
    i.on ? validateCustomTask({ prompt: i.task.prompt, answer: i.answer, cellCount: Math.max(i.task.cellCount, [...i.answer.trim()].length) }, manifest.data?.alphabet ?? null) : [];
  const chosen = (items ?? []).filter((i) => i.on);
  const hasProblem = (items ?? []).some((i) => problems(i).length > 0);

  const add = async () => {
    if (!backendApi || !items) return;
    setSaving(true);
    setError(null);
    const created: TaskBankEntry[] = [];
    for (const i of chosen) {
      const answer = i.answer.trim().toUpperCase();
      const r = await backendApi.createTask({
        prompt: i.task.prompt,
        answer,
        cellCount: Math.min(MAX_CELLS, Math.max(i.task.cellCount, defaultCells(answer))),
        gradeLevel: draft.gradeLevel,
        topicTag: i.task.topicTag,
        topicName: i.task.topicName,
      });
      if (!r.ok) {
        setSaving(false);
        if (created.length > 0) testDraft.addTasks(created);
        setError('Не удалось сохранить часть заданий: сервер не принял запрос. Уже сохранённые добавлены в тест.');
        return;
      }
      created.push(r.value);
    }
    testDraft.addTasks(created);
    void bankResource.refresh();
    setSaving(false);
    router.back();
  };

  if (!consented) {
    return (
      <Screen
        footer={
          <Button
            icon="check"
            onPress={() => {
              kvStore.set(CONSENT_KEY, '1');
              setConsented(true);
            }}
            title="Понятно, продолжить"
          />
        }
      >
        <ScreenHeader showBack size="compact" title="Задания из фото" />
        <Card style={styles.notice} tone="raised">
          <StatusPill icon="warning" label="Фото уйдёт с телефона" tone="warning" />
          <Text style={textStyles.body}>Фотография упражнения отправится на наш сервер и будет распознана внешним сервисом.</Text>
          <Text style={textStyles.bodySmall}>Фотографируйте только страницы учебника или рабочей тетради. Не снимайте работы учеников и людей: их листы проверяются только на телефоне и никуда не отправляются.</Text>
          <Text style={textStyles.bodySmall}>Приложение не хранит снимок: после отправки он удаляется.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      avoidKeyboard
      footer={
        items ? (
          <Button disabled={chosen.length === 0 || hasProblem || saving} icon="check" onPress={() => void add()} title={saving ? 'Сохраняем…' : `Добавить в тест (${chosen.length})`} />
        ) : undefined
      }
    >
      <ScreenHeader showBack size="compact" subtitle={`Для ${draft.gradeLevel} класса`} title="Задания из фото" />

      {items === null ? (
        <>
          <Text style={textStyles.bodySmall}>Сфотографируйте упражнение из учебника: сервер найдёт задания и подберёт ответы.</Text>
          <View style={styles.sources}>
            <View style={styles.grow}><Button disabled={busy} icon="camera" onPress={() => void scan('camera')} title="Снять" /></View>
            <View style={styles.grow}><Button disabled={busy} icon="library" onPress={() => void scan('library')} title="Из галереи" variant="secondary" /></View>
          </View>
          {busy ? <Notice message="Распознаём фото… это занимает несколько секунд." tone="info" /> : null}
          {unsupported ? <Notice message={unsupported} tone="info" /> : null}
          <Text style={textStyles.caption}>Только учебные материалы, не работы учеников.</Text>
        </>
      ) : (
        <>
          <Notice message="Ответы подобрал ИИ и в них бывают ошибки. Проверьте каждый, при необходимости поправьте." />
          <View style={styles.list}>
            {items.map((i, idx) => {
              const issues = problems(i);
              return (
                <View key={i.task.taskId} style={styles.item}>
                  <TaskRow
                    accessibilityState={{ checked: i.on }}
                    answer={i.answer}
                    cellCount={Math.min(MAX_CELLS, Math.max(i.task.cellCount, [...i.answer.trim()].length))}
                    dense
                    onPress={() => setItems((all) => all && all.map((x, k) => (k === idx ? { ...x, on: !x.on } : x)))}
                    prompt={i.task.prompt}
                    right={<View style={[styles.check, i.on && styles.checkOn]}>{i.on ? <AppIcon color={colors.background} name="check" size={18} /> : null}</View>}
                    topicName={i.task.topicName}
                  />
                  {i.on ? (
                    <View style={styles.answer}>
                      <Field autoCapitalize="characters" label="Ответ (проверьте)" onChangeText={(answer) => setItems((all) => all && all.map((x, k) => (k === idx ? { ...x, answer } : x)))} value={i.answer} />
                      {issues.map((k) => <Notice key={k} message={customTaskIssueText[k]} tone="error" />)}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <Button icon="camera" onPress={() => { setItems(null); setRawText(''); }} title="Снять другое упражнение" variant="ghost" />
          {rawText ? <Text style={textStyles.caption}>Распознанный текст: {rawText.replace(/\s+/g, ' ').slice(0, 240)}</Text> : null}
        </>
      )}
      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  answer: { gap: spacing.xs, paddingTop: spacing.xs },
  check: { alignItems: 'center', borderColor: colors.textMuted, borderRadius: 8, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  grow: { flex: 1 },
  item: { gap: 0 },
  list: { gap: spacing.sm },
  notice: { gap: spacing.sm },
  sources: { flexDirection: 'row', gap: spacing.sm },
});
