import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { backendApi } from '@/composition';
import { classAnalyticsResource, classesResource, rosterResource } from '@/data/hub';
import { session } from '@/data/session';
import { Button, Field, Notice, Screen, ScreenHeader } from '@/design-system';

/** Creates a class (the backend creates it with its first students) or adds students to an existing one. */
export function ClassFormScreen() {
  const router = useRouter();
  const { classId: existing } = useLocalSearchParams<{ classId?: string }>();
  const [className, setClassName] = useState('');
  const [names, setNames] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = names.split('\n').map((l) => l.trim()).filter(Boolean);
  const classId = existing ?? className.trim();
  const canSubmit = classId.length >= 1 && lines.length >= 1 && !busy;

  const submit = async () => {
    if (!backendApi) return;
    setBusy(true);
    setError(null);
    const result = await backendApi.importStudents(classId, lines);
    if (!result.ok) {
      setBusy(false);
      setError('Не удалось сохранить: сервер не ответил. Проверьте интернет и повторите.');
      return;
    }
    await Promise.all([classesResource.refresh(), rosterResource(classId).refresh()]);
    void classAnalyticsResource(classId).refresh();
    session.selectClass(classId);
    setBusy(false);
    router.back();
  };

  return (
    <Screen
      footer={<Button disabled={!canSubmit} icon="check" onPress={() => void submit()} title={busy ? 'Сохраняем…' : existing ? 'Добавить учеников' : 'Создать класс'} />}
    >
      <ScreenHeader
        showBack
        subtitle={existing ? `Класс ${existing}` : 'Название и список учеников.'}
        title={existing ? 'Новые ученики' : 'Новый класс'}
      />
      {existing ? null : <Field autoCapitalize="none" label="Название класса" onChangeText={setClassName} placeholder="7-А" value={className} />}
      <Field
        label="Ученики — по одному в строке (Фамилия Имя Отчество)"
        multiline
        onChangeText={setNames}
        placeholder={'Галиев Амир Рустемович\nСафина Алия Ильдаровна'}
        value={names}
      />
      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}
