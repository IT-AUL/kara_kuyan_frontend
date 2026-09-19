import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { backendApi } from '@/composition';
import { bundleResource, testsResource } from '@/data/hub';
import { session } from '@/data/session';
import { testDraft, useTestDraft } from '@/data/testDraft';
import { Button, Field, Notice, Screen, ScreenHeader, SegmentedTabs, textStyles } from '@/design-system';

const GRADES = ['5', '6', '7', '8', '9'] as const;
const VARIANTS = ['1', '2', '3', '4'] as const;

/** Assembles a test on the backend: it returns the full offline bundle, so the test is scannable at once. */
export function TestFormScreen() {
  const router = useRouter();
  const draft = useTestDraft();
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState(2);
  const [variants, setVariants] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = title.trim().length >= 3 && !busy;

  const submit = async () => {
    if (!backendApi) return;
    setBusy(true);
    setError(null);
    const result = await backendApi.assembleTest({
      title: title.trim(),
      gradeLevel: Number(GRADES[grade]),
      variants: Number(VARIANTS[variants]),
      taskIds: draft.length > 0 ? draft : undefined,
    });
    if (!result.ok) {
      setBusy(false);
      setError('Не удалось создать тест: сервер не принял запрос или не ответил.');
      return;
    }
    bundleResource(result.value.assignmentId).put(result.value);
    await testsResource.refresh();
    session.selectAssignment(result.value.assignmentId);
    testDraft.clear();
    setBusy(false);
    router.back();
  };

  return (
    <Screen footer={<Button disabled={!canSubmit} icon="check" onPress={() => void submit()} title={busy ? 'Создаём…' : 'Создать тест'} />}>
      <ScreenHeader showBack subtitle="Сервер подберёт задания и сделает бланки." title="Новый тест" />
      <Field label="Название" onChangeText={setTitle} placeholder="Контрольная работа №4" value={title} />
      <Text style={textStyles.bodySmall}>Класс (параллель)</Text>
      <SegmentedTabs activeIndex={grade} onTabChange={setGrade} tabs={GRADES} />
      <Text style={textStyles.bodySmall}>Вариантов</Text>
      <SegmentedTabs activeIndex={variants} onTabChange={setVariants} tabs={VARIANTS} />
      <Text style={textStyles.caption}>
        {draft.length > 0 ? `Выбрано заданий из банка: ${draft.length}.` : 'Задания не выбраны: сервер подберёт их сам. Выбрать вручную можно во вкладке «Банк заданий».'}
      </Text>
      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}
