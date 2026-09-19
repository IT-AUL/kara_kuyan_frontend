import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { backendApi } from '@/composition';
import { bankResource, manifestResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { testDraft, useTestDraft } from '@/data/testDraft';
import { customTaskIssueText, defaultCells, MAX_CELLS, uniqueTopics, validateCustomTask } from '@/domain/constructor/draft';
import { Button, Chips, Field, Notice, Screen, ScreenHeader, Stepper, textStyles } from '@/design-system';
import { colors, hairline, radius, spacing } from '@/design-system/tokens';

import { CellBoxes } from './components/CellBoxes';

/**
 * A teacher-written task, made for speed: answer letters appear in cells as you type, the cell count follows the
 * answer, «Сохранить и ещё одно» keeps the teacher in the flow for a whole test.
 */
export function TaskNewScreen() {
  const router = useRouter();
  const draft = useTestDraft();
  const manifest = useResource(manifestResource);
  const bank = useResource(bankResource);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [cells, setCells] = useState<number | null>(null);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);

  const upper = answer.trim().toUpperCase();
  const letters = [...upper].length;
  const cellCount = Math.max(cells ?? defaultCells(upper), letters);
  const issues = validateCustomTask({ prompt, answer: upper, cellCount }, manifest.data?.alphabet ?? null);
  const touched = prompt.length > 0 || answer.length > 0;
  const topics = useMemo(() => uniqueTopics(bank.data ?? []).slice(0, 5), [bank.data]);

  const save = async (another: boolean) => {
    if (!backendApi || issues.length > 0) return;
    setBusy(true);
    setError(null);
    const r = await backendApi.createTask({ prompt: prompt.trim(), answer: upper, cellCount, gradeLevel: draft.gradeLevel, topicTag: 'custom', topicName: topic.trim() || 'Своё задание' });
    setBusy(false);
    if (!r.ok) {
      setError('Не удалось сохранить задание: сервер не принял его.');
      return;
    }
    testDraft.addTasks([r.value]);
    void bankResource.refresh();
    if (another) {
      setPrompt('');
      setAnswer('');
      setCells(null);
      setAdded((n) => n + 1);
    } else {
      router.back();
    }
  };

  const ok = issues.length === 0 && !busy;

  return (
    <Screen
      avoidKeyboard
      footer={
        <View style={styles.footer}>
          <View style={styles.main}><Button disabled={!ok} icon="check" onPress={() => void save(false)} title={busy ? 'Сохраняем…' : 'Добавить'} /></View>
          <View style={styles.more}><Button accessibilityLabel="Сохранить и добавить ещё одно задание" disabled={!ok} icon="add" onPress={() => void save(true)} title="Ещё" variant="secondary" /></View>
        </View>
      }
    >
      <ScreenHeader showBack size="compact" subtitle={added > 0 ? `Добавлено в тест: ${added}` : `Для ${draft.gradeLevel} класса`} title="Своё задание" />

      <Field label="Вопрос" lines={3} multiline onChangeText={setPrompt} placeholder="Куегыз сүзне юнәлеш килешендә: китап ->" value={prompt} />
      <Field autoCapitalize="characters" label="Правильный ответ" onChangeText={setAnswer} placeholder="КИТАПКА" value={answer} />

      {upper.length > 0 ? (
        <View style={styles.preview}>
          <Text style={textStyles.caption}>На бланке · {letters} букв</Text>
          <CellBoxes answer={upper} cellCount={cellCount} size={30} />
        </View>
      ) : null}
      <Stepper compact={false} label="Клеток в строке" max={MAX_CELLS} min={Math.max(1, letters)} onChange={setCells} value={cellCount} />

      <Field label="Тема (необязательно)" onChangeText={setTopic} placeholder="Своё задание" value={topic} />
      {topics.length > 0 ? <Chips items={topics.map((t) => ({ key: t.name, label: t.name }))} onSelect={(name) => setTopic(name ?? '')} selected={topics.some((t) => t.name === topic) ? topic : null} /> : null}

      {manifest.data === null ? <Notice message="Алфавит распознавания ещё не загружен: буквы ответа не проверяются." tone="info" /> : null}
      {touched ? issues.map((i) => <Notice key={i} message={customTaskIssueText[i]} tone="error" />) : null}
      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: spacing.xs },
  main: { flex: 2 },
  more: { flex: 1 },
  preview: { backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.lg, borderWidth: hairline, gap: spacing.xs, padding: spacing.md },
});
