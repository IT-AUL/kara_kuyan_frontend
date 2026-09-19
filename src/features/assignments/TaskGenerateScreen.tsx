import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { backendApi } from '@/composition';
import type { TaskBankEntry } from '@/adapters/api/backend';
import { bankResource, taskTypesResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { testDraft, useTestDraft } from '@/data/testDraft';
import { AppIcon, Button, Chips, Field, Notice, Screen, ScreenHeader, Stepper, textStyles } from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';

import { TaskRow } from './components/TaskRow';

/** Server-side generator: pick a kind of exercise and a count, review the result, add what fits. */
export function TaskGenerateScreen() {
  const router = useRouter();
  const types = useResource(taskTypesResource);
  const draft = useTestDraft();
  const [chosenType, setType] = useState<string | null>(null);
  const [count, setCount] = useState(4);
  const [stems, setStems] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TaskBankEntry[] | null>(null);
  const [picked, setPicked] = useState<readonly string[]>([]);

  const type = chosenType ?? types.data?.[0]?.taskType ?? null;

  const generate = async () => {
    if (!backendApi || !type) return;
    setBusy(true);
    setError(null);
    const words = stems.split(/[\n,;]/).map((w) => w.trim()).filter(Boolean);
    const r = await backendApi.generateTasks({ taskType: type, count, gradeLevel: draft.gradeLevel, customStems: words });
    setBusy(false);
    if (!r.ok) {
      setError('Не удалось сгенерировать задания: сервер не ответил или не принял слова.');
      return;
    }
    setResult(r.value);
    setPicked(r.value.map((t) => t.taskId));
  };

  const add = () => {
    testDraft.addTasks((result ?? []).filter((t) => picked.includes(t.taskId)));
    void bankResource.refresh();
    router.back();
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Screen
      avoidKeyboard
      footer={
        result ? (
          <Button disabled={picked.length === 0} icon="check" onPress={add} title={`Добавить в тест (${picked.length})`} />
        ) : (
          <Button disabled={!type || busy} icon="insight" onPress={() => void generate()} title={busy ? 'Генерируем…' : 'Сгенерировать'} />
        )
      }
    >
      <ScreenHeader showBack size="compact" subtitle={`Для ${draft.gradeLevel} класса`} title="Генератор заданий" />

      {result === null ? (
        <>
          <Text style={textStyles.bodySmall}>Тип упражнения</Text>
          {types.data ? (
            <Chips items={types.data.map((t) => ({ key: t.taskType, label: t.topicName }))} onSelect={setType} selected={type} />
          ) : (
            <Notice actionLabel="Повторить" message="Загружаем типы упражнений…" onAction={() => void types.refresh()} tone="info" />
          )}
          <Stepper label="Сколько заданий" max={10} min={1} onChange={setCount} value={count} />
          <Field
            label="Свои слова — по одному в строке (необязательно)"
            lines={3}
            multiline
            onChangeText={setStems}
            placeholder={'китап\nөстәл'}
            value={stems}
          />
        </>
      ) : (
        <View style={styles.list}>
          <Text style={textStyles.bodySmall}>Отметьте, что добавить в тест. Снимите лишнее.</Text>
          {result.map((t) => {
            const on = picked.includes(t.taskId);
            return (
              <TaskRow
                accessibilityState={{ checked: on }}
                answer={t.expectedAnswer}
                cellCount={t.cellCount}
                dense
                key={t.taskId}
                onPress={() => toggle(t.taskId)}
                prompt={t.prompt}
                right={<View style={[styles.check, on && styles.checkOn]}>{on ? <AppIcon color={colors.background} name="check" size={18} /> : null}</View>}
                topicName={t.topicName}
              />
            );
          })}
          <Button icon="sync" onPress={() => setResult(null)} title="Сгенерировать заново" variant="ghost" />
        </View>
      )}
      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: { alignItems: 'center', borderColor: colors.textMuted, borderRadius: 8, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  list: { gap: spacing.sm },
});
